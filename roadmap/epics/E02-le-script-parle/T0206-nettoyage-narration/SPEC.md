---
id: T0206
epic: E02
titre: Trancher le sort du code de narration inutilisé
statut: specifiee
type: dette
depend_de: [T0203, T0205]
adr: []
research: []
hypotheses: []
effort: S
---

# T0206 — Trancher le sort du code de narration inutilisé

## Problème

Deux services de narration, soignés et testés, ne sont **jamais appelés** — ni par un
gestionnaire de requête, ni par un workflow, ni par un script, ni par le conteneur
d'injection. Leur seule référence est leur ré-export
(`apps/api/src/services/narration/index.ts:74,77`) et leur test unitaire.

| Service | Lignes | Ce qu'il fait |
|---|---|---|
| `voice-matching.service.ts` | 403 | Correspondance voix / personnage par score de tonalité |
| `tts-batch.service.ts` | 345 | Regroupement de répliques courtes pour la qualité de synthèse |

748 lignes qui n'ont jamais produit une seconde d'audio. Le pipeline emprunte le chemin le
plus naïf — l'attribution frustre de T0205 et la synthèse par réplique — pendant que le code
qui ferait mieux dort.

Le calcul de pauses (`pause-computation.service.ts`, 271 lignes) est dans une situation
différente : il **est** appelé, mais depuis le moteur de timeline que E04 supprime. Il devient
donc mort par ricochet.

**Un piège à éviter, déjà rencontré.** La stratégie musicale semblait morte au même titre et
ne l'est pas : elle est instanciée par les scripts et liée dans le conteneur. Vérifier les
scripts et les liaisons du conteneur avant de conclure fait partie de cette tâche.

## Objectif

Plus aucun module de narration n'est écrit sans être appelé.

## Périmètre

**Dans :**
- La décision, pour chaque module concerné : brancher ou supprimer
- L'exécution de cette décision
- La vérification qu'aucun module de narration n'est injoignable après coup

**Hors :**
- Le reste du code mort du dépôt, qui relève de E09
- Toute réécriture de ces services au-delà de ce que leur branchement exige

## Comportement attendu

### Cas nominal

Chaque module concerné reçoit une décision écrite et appliquée. Un module branché est
atteignable depuis un chemin d'exécution réel et couvert par au moins un test qui passe par ce
chemin. Un module supprimé disparaît entièrement : implémentation, types, ré-export, tests.

Il n'existe pas de troisième issue. « On le garde au cas où » est ce qui a produit la
situation actuelle.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Un module s'avère atteignable depuis un script | Il n'est pas mort : la décision porte alors sur son absence du chemin de production |
| Un module est référencé par un test seulement | Le test disparaît avec lui |
| Un module est partiellement utile | Il est branché ou supprimé en entier ; un découpage est une autre tâche |
| Le branchement révèle que le module ne fonctionne pas | La suppression devient l'issue par défaut, et la raison est écrite |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Un module supprimé s'avère référencé ailleurs | La compilation échoue, ce qui est le comportement souhaité | **échec** | vérification de types |

## Contrats

Aucun contrat externe ne change.

## Critères d'acceptation

1. Chaque module de narration aujourd'hui injoignable porte une décision écrite — branché ou
   supprimé — avec sa raison.
2. Aucun export du répertoire de narration n'est injoignable depuis un gestionnaire de
   requête, un workflow, un script ou le conteneur d'injection. Vérifiable par recherche
   exhaustive, incluant les liaisons du conteneur et les instanciations dans les scripts.
3. Un module supprimé n'a plus aucune trace : implémentation, types, ré-export, tests.
4. Un module branché est couvert par au moins un test qui l'atteint par le chemin réel, et
   non par appel direct.
5. Le calcul de pauses est traité, en cohérence avec la suppression du moteur de timeline
   prévue en E04.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1 | Lecture de la décision écrite |
| 2 | Recherche exhaustive des usages, incluant conteneur et scripts |
| 3 | Recherche du nom du module dans le dépôt |
| 4 | Lecture du test : il doit partir du chemin d'exécution, pas du module |
| 5 | Cohérence avec l'état de E04 au moment de la revue |

## Impacts

- **Réduit le dépôt de plusieurs centaines de lignes**, ou augmente sa couverture réelle.
- **Peut changer le rendu audio** si un module est branché — auquel cas la mesure `audio-qa`
  avant / après est requise, et la tâche cesse d'être un simple nettoyage.
- **Dépend de T0205** : brancher la correspondance de voix rendrait caduque une partie de
  l'attribution spécifiée là-bas. Les deux décisions se prennent ensemble.

## Risques et questions ouvertes

**Brancher plutôt que supprimer transforme cette tâche.** Une suppression est sans risque ; un
branchement change ce qu'on entend et exige d'être mesuré. Si la correspondance de voix est
branchée, T0205 doit être relue avant d'être implémentée.

**La décision dépend de l'ordre.** Si T0205 est implémentée d'abord avec sa détection par
mots-clés corrigée, la correspondance de voix devient redondante et la suppression s'impose.
Si cette tâche est traitée d'abord, l'inverse. **Question ouverte : l'ordre entre T0205 et
T0206 est lui-même une décision**, et il vaut mieux la prendre consciemment que par hasard.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
