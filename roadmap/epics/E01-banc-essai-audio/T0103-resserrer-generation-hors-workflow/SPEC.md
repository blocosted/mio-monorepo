---
id: T0103
epic: E01
titre: Resserrer la génération hors workflow
statut: specifiee
type: dette
depend_de: []
adr: [ADR-0001]
research: []
hypotheses: []
effort: M
---

# T0103 — Resserrer la génération hors workflow

## Problème

Un chemin de génération hors file de messages **existe déjà** :
`nx run scripts:pipeline -- full-story --scriptFile <script.json>`
(`packages/scripts/src/pipeline/cli.ts:22-40`, `packages/scripts/src/pipeline/full-story.ts`).
Il enchaîne synthèse, bruitages, ambiance, musique et mixage à partir d'un script figé. C'est
la brique centrale du banc d'essai, et elle n'a pas à être réécrite.

Mais elle ne peut pas servir de référence de mesure en l'état, pour trois raisons établies :

**Elle diverge du chemin de production.** Les services y sont instanciés directement, hors du
conteneur d'injection (`full-story.ts`, `new` à répétition). Ce que le banc d'essai mesure
n'est donc pas nécessairement ce que le workflow produit — et un banc d'essai qui mesure autre
chose que la production est pire qu'aucun banc d'essai, parce qu'on lui fait confiance.

**Elle retrouve ses propres sorties par tri de répertoire.** `full-story.ts:212-222` liste un
répertoire, le trie et prend le premier, pour retrouver « la dernière exécution de synthèse ».
Deux exécutions concurrentes, ou une exécution interrompue, et la mesure porte sur les
fichiers d'une autre.

**Elle travaille à l'échelle de l'histoire entière.** Le banc d'essai a besoin de l'échelle de
la scène : c'est ce qui fait la différence entre une boucle de retour de quinze minutes et
d'une heure.

## Objectif

Une commande unique régénère une scène donnée par le même code que la production, et désigne
sans ambiguïté les fichiers qu'elle vient de produire.

## Périmètre

**Dans :**
- Le passage par le conteneur d'injection, comme le chemin de production
- La désignation explicite des sorties d'une exécution, sans découverte par tri
- L'échelle de la scène : un sous-ensemble du script, pas l'histoire entière
- L'échec franc quand une étape ne produit pas ce qu'elle devrait

**Hors :**
- Toute amélioration du rendu — cette tâche ne change pas une note de ce qui sort
- La conservation des artefacts, qui est T0104
- La comparaison de deux rendus, qui est T0105
- Le remplacement du système de file de messages en production

## Comportement attendu

### Cas nominal

La commande reçoit un script et la désignation d'une scène. Elle produit les stems et le mix
de cette scène, et rend l'emplacement exact de chaque artefact produit — sans qu'aucun
consommateur n'ait à deviner où ils sont.

Le code de génération emprunté est celui de la production : les mêmes services, résolus de la
même façon. Seul l'orchestrateur diffère — pas de file de messages, pas de suivi de
progression en base.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Le script ne contient pas la scène désignée | Échec nommant la scène demandée et listant celles disponibles |
| La scène ne contient aucun segment vocal | Échec explicite : il n'y a rien à mesurer |
| Deux exécutions simultanées sur le même script | Chacune désigne ses propres artefacts, aucune ne peut lire ceux de l'autre |
| Une exécution précédente a laissé des artefacts partiels | Ils ne sont jamais confondus avec ceux de l'exécution courante |
| Une étape optionnelle ne produit rien (pas de musique dans la scène) | L'exécution aboutit, et l'absence de ce stem est explicite dans le résultat |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Une étape échoue | Arrêt, en nommant l'étape et la cause | **échec** | sortie d'erreur |
| Une étape aboutit sans produire son artefact | Arrêt : c'est le défaut qu'on veut rendre visible | **échec** | sortie d'erreur |
| Un service n'est pas résolvable dans le conteneur | Arrêt avant toute génération | **échec** | sortie d'erreur |
| Un identifiant d'environnement manque | Arrêt avant toute génération, en nommant la variable | **échec** | sortie d'erreur |

Aucun repli. Une génération partielle qui se présente comme réussie fausserait toute mesure
qui la suit.

## Contrats

### Désignation d'une scène

Une scène est un intervalle de tours de parole du script. La commande accepte de désigner cet
intervalle, et de traiter le script entier par défaut.

### Résultat d'exécution

L'exécution rend, sous une forme lisible par machine, l'emplacement de chaque artefact
produit : le mix, chaque stem, le script effectivement utilisé. Aucun consommateur ne doit
avoir à explorer le système de fichiers pour les retrouver.

## Critères d'acceptation

1. Les services utilisés sont résolus par le conteneur d'injection, comme en production.
   Vérifiable par lecture du code : aucune instanciation directe des services de génération.
2. L'exécution rend l'emplacement de chaque artefact produit ; aucun code appelant ne
   découvre un fichier par listage ou tri de répertoire.
3. Deux exécutions lancées simultanément sur le même script produisent des artefacts
   distincts, et chacune ne rend que les siens.
4. Une scène désignée mais absente du script fait échouer la commande avec un message la
   nommant.
5. Une étape qui aboutit sans produire son artefact fait échouer la commande.
6. Le temps écoulé pour une scène d'une minute est inférieur au tiers de celui d'une histoire
   de cinq minutes, mesuré sur le même script.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1 | Lecture du code, recherche des instanciations directes |
| 2 | Lecture du code appelant ; test sur la forme du résultat |
| 3 | Test d'intégration lançant deux exécutions concurrentes |
| 4, 5 | Tests sur le code de sortie et le message |
| 6 | Mesure chronométrée, consignée dans le résultat de T0106 |

## Impacts

- **Prérequis de tout le banc d'essai** : T0104, T0105 et T0106 consomment le résultat
  d'exécution défini ici.
- **Code supprimé** : la découverte de répertoire par tri (`full-story.ts:212-222`) et les
  instanciations directes de services.
- **Risque de régression sur les scripts existants** : d'autres commandes s'appuient sur le
  même chemin. Elles doivent continuer de fonctionner ou être migrées dans la même passe.
- Aucun impact sur le workflow de production.

## Risques et questions ouvertes

**Le conteneur d'injection peut ne pas être utilisable hors du serveur.** Il est initialisé au
démarrage de l'API. S'il s'avère qu'il ne peut pas l'être depuis un script sans monter tout
le serveur, il faut choisir entre l'extraire et accepter la divergence — auquel cas cette
divergence doit être écrite et bornée, pas subie. **Ce cas est un retour vers cette spec.**

**La notion de scène n'existe pas dans le format de script actuel.** Le script est une suite
de tours sans découpage en scènes. Désigner un intervalle est donc un contrat de cette
commande, pas une propriété du script — et il faudra le revoir quand T0201 redéfinira le
format.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
