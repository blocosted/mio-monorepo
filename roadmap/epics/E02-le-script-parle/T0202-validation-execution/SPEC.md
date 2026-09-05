---
id: T0202
epic: E02
titre: Valider le script à l'exécution
statut: specifiee
type: fix
depend_de: [T0201]
adr: []
research: []
hypotheses: []
effort: M
---

# T0202 — Valider le script à l'exécution

## Problème

Le script produit par le modèle de langage entre dans le système **sans aucune validation
d'exécution**. `script-generation.service.ts:428-432` procède par assertion de type :
`metadata as …`, `characters as …`, `tracks as StoryScript['tracks']`. Une assertion de type
ne vérifie rien à l'exécution ; elle demande au compilateur de se taire.

Trois conséquences observées, toutes silencieuses :

**Une émotion inconnue désarme le jeu.** Le prompt déclare pour les dialogues
`"emotion": "string"` — champ libre (`scriptGeneration.prompts.ts:146`). Une valeur hors des
neuf connues fait que `EMOTION_AUDIO_TAGS[emotion]` vaut `undefined`, donc aucun marqueur
n'est posé (`tts.service.ts:111`), et que les réglages retombent sur le neutre
(`:323-325`) — sans un log. Les dialogues, qui ont le plus besoin de jeu, sont ceux dont
l'intention est la moins contrôlée.

**Une référence croisée invalide empile les sons au début.**
`timeline-computation.service.ts:411-418` renvoie `0` quand l'ancre est introuvable.

**Une valeur d'énumération inconnue retombe en silence.** Ambiance inconnue → `forest`
(`llm.service.parser.ts:176`) ; ton inconnu → `adventurous` (`:188`). Aucun log dans les deux
cas.

La boucle de reprise avec retour d'erreur existe déjà et fonctionne — elle valide le nombre de
mots, le nombre de segments et leur ordre (`script-generation.service.ts:290-317`). Elle ne
regarde simplement pas la validité structurelle.

## Objectif

Un script invalide est rejeté avec une raison exploitable, jamais accepté avec des valeurs de
remplacement.

## Périmètre

**Dans :**
- La validation d'exécution de la structure complète du script
- La vérification de l'intégrité des références entre tours et intentions sonores
- La vérification des valeurs d'énumération
- Le bornage des grandeurs
- Un retour d'erreur exploitable par la boucle de reprise existante
- La suppression des replis silencieux sur le chemin concerné

**Hors :**
- La qualité d'écriture — E05
- La sécurité du contenu — E06. **Cette tâche valide la forme, pas le fond**, et la
  distinction doit rester nette : un script parfaitement structuré peut être inacceptable
- La validation des entrées HTTP, déjà assurée aux frontières

## Comportement attendu

### Cas nominal

Un script conforme au format traverse la validation sans transformation. La validation ne
corrige ni ne complète : elle accepte ou rejette.

Un script non conforme est rejeté avec une description des écarts assez précise pour qu'une
nouvelle tentative de génération puisse les corriger — c'est ce que la boucle de reprise
existante sait consommer.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Une valeur d'énumération inconnue | Rejet nommant le champ, la valeur reçue et les valeurs admises |
| Une intention sonore rattachée à un tour inexistant | Rejet nommant l'identifiant introuvable |
| Deux tours portant le même identifiant | Rejet |
| Un locuteur cité par un tour et absent de la table | Rejet nommant le locuteur |
| Un locuteur déclaré et jamais utilisé | Accepté, mais signalé — c'est un gaspillage de voix, pas une erreur |
| Un texte de tour vide ou blanc | Rejet |
| Un texte dépassant la borne haute | Rejet nommant la borne |
| Un champ optionnel absent | Accepté |
| Un champ inconnu présent | Rejet : c'est le symptôme d'un modèle qui invente, ou d'un format qui a bougé |
| Script vide de tours | Rejet |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Le contenu n'est pas du JSON | Rejet, avec un extrait du contenu reçu | **échec** | retour de reprise |
| Le JSON est valide mais la structure ne correspond pas | Rejet listant les écarts | **échec** | retour de reprise |
| Toutes les tentatives de reprise échouent | Échec de la génération, en conservant les écarts de chaque tentative | **échec** | journal et état du travail |

**Aucun repli.** C'est l'objet même de la tâche : là où le système remplaçait en silence, il
rejette et redemande.

## Contrats

### Résultat de validation

Soit un script accepté, soit une liste d'écarts. Chaque écart porte : l'emplacement dans le
document, la nature du problème, la valeur reçue, et ce qui était attendu. Cette liste est
consommée telle quelle par la boucle de reprise pour construire le retour au modèle.

### Bornes

Toute grandeur textuelle et toute collection portent une borne haute explicite, y compris
celles qui viennent du modèle. Une borne absente est un défaut de cette tâche.

## Critères d'acceptation

1. Un script contenant une valeur d'énumération inconnue est rejeté, et l'écart nomme le
   champ, la valeur reçue et les valeurs admises.
2. Un script dont une intention sonore référence un tour inexistant est rejeté, et l'écart
   nomme l'identifiant introuvable.
3. Un script valide traverse la validation sans qu'aucune valeur ne soit modifiée, ajoutée ou
   supprimée. Vérifiable par comparaison stricte entrée / sortie.
4. Aucun repli silencieux ne subsiste sur le chemin de génération de script : toute valeur de
   remplacement a disparu ou est journalisée avec son contexte.
5. Les écarts produits permettent à la boucle de reprise d'aboutir : sur un jeu de scripts
   volontairement défectueux, une reprise corrige l'écart signalé.
6. Toute grandeur textuelle issue du modèle est bornée, et un dépassement est rejeté en
   nommant la borne.
7. Un champ inconnu dans le document fait échouer la validation.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 2, 6, 7 | Tests unitaires sur des scripts défectueux construits pour l'épreuve |
| 3 | Test de comparaison stricte sur un script valide |
| 4 | Recherche dans le code des valeurs de remplacement sur le chemin concerné |
| 5 | Test d'intégration avec un modèle simulé rendant d'abord un script défectueux |

## Impacts

- **Supprime trois défauts audibles** dont deux étaient parfaitement muets.
- **Augmente le taux de reprise** : des scripts aujourd'hui acceptés seront rejetés. C'est
  voulu, et cela a un coût en appels au fournisseur, à mesurer via T0106.
- **Code supprimé** : les assertions de type sur la réponse du modèle, et les replis
  d'énumération de `llm.service.parser.ts`.

## Risques et questions ouvertes

**Une validation trop stricte peut rendre la génération impraticable.** Si le modèle échoue
systématiquement sur un champ, la boucle de reprise épuise ses tentatives et aucune histoire
ne sort. Le garde-fou est le critère 5, mais il ne couvre que les cas d'épreuve. **À
surveiller dès les premières générations réelles** : un taux de rejet élevé signale un prompt
à corriger, pas une validation à assouplir.

**Le rejet d'un champ inconnu est délibérément rigide.** Il attrape un modèle qui invente et
un format qui a bougé, au prix de rejeter un enrichissement inoffensif. C'est le bon
arbitrage ici : le silence sur l'inattendu est exactement le défaut corrigé.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
