---
id: T0205
epic: E02
titre: Attribution des voix — narrateur explicite, unicité, français
statut: specifiee
type: fix
depend_de: [T0201]
adr: []
research: []
hypotheses: []
effort: M
---

# T0205 — Attribution des voix — narrateur explicite, unicité, français

## Problème

L'attribution des voix produit quatre défauts audibles, tous vérifiés dans le code.

**Le narrateur parle avec la voix du héros.** Un segment sans nom de personnage retombe sur
`script.characters[0]` (`voice-generation.orchestrator.ts:152`). Le narrateur n'est donc pas
une voix, c'est « le premier personnage du tableau ».

**Deux personnages peuvent recevoir la même voix.**
`voice-assignment.service.ts:278` retient `candidates[0]`, sans aucune déduplication. Deux
personnages dont la description mène au même filtre partagent leur voix.

**La détection échoue en français.** Les mots-clés de genre et d'âge sont écrits sans accents —
`'mere'`, `'pere'`, `'garcon'`, `'grand-mere'`, `'frere'`, `'vieille'` (`:48-56`) — et la
comparaison se fait par simple mise en minuscules (`:231`), sans normalisation des
diacritiques. Le modèle, lui, écrit « mère », « père », « garçon ». La majorité des mots-clés
français ne matchent jamais.

**Deux collisions de sous-chaînes annulent la détection.** `'male'` est contenu dans
`'female'` et `'man'` dans `'woman'` : une description anglaise disant « woman » active les
deux listes, et `detectGender` retourne `null` (`:294-306`). Même mécanisme pour
« princesse », qui contient « prince ». Les personnages féminins les plus explicitement
désignés sont ceux qui perdent leur filtre de genre.

Un service de correspondance de voix nettement plus fin existe et n'est jamais appelé
(`voice-matching.service.ts`, 403 lignes) — voir T0206 pour son sort.

## Objectif

Chaque locuteur du script reçoit une voix distincte, stable, et cohérente avec sa description
y compris en français.

## Périmètre

**Dans :**
- Le narrateur comme locuteur à part entière
- L'unicité des voix entre locuteurs
- La stabilité d'une voix sur toute la durée d'une histoire
- La détection de genre et d'âge fiable en français comme en anglais
- Le comportement quand le catalogue ne permet pas de satisfaire la demande

**Hors :**
- L'enrichissement du catalogue de voix, et sa synchronisation
- Le choix d'utiliser ou non le service de correspondance existant, qui est une décision de
  T0206
- La qualité du jeu, qui dépend de l'intention transmise en T0203

## Comportement attendu

### Cas nominal

Chaque locuteur déclaré dans le script — narrateur compris — reçoit une voix. Deux locuteurs
distincts d'une même histoire ne partagent jamais leur voix. Un locuteur conserve la sienne
d'un bout à l'autre.

L'attribution s'appuie sur la description du locuteur, quelle que soit la langue dans laquelle
elle est écrite et qu'elle porte ou non des accents.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Description contenant « woman », « princesse », « grand-mère » | Le genre est détecté, sans annulation par sous-chaîne |
| Description sans indication de genre ni d'âge | Une voix est attribuée, et la faible confiance de ce choix est visible |
| Plus de locuteurs que de voix disponibles satisfaisant les critères | Échec explicite plutôt qu'un partage silencieux de voix |
| Deux locuteurs aux descriptions identiques | Voix différentes malgré tout : l'unicité prime sur la ressemblance |
| Un locuteur porte déjà une voix attribuée | Elle est conservée, et compte dans l'unicité |
| Le catalogue est vide | Échec explicite, avant toute génération |
| Une description dans une langue non prévue | Une voix est attribuée, et la faible confiance est visible |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Aucune voix ne satisfait les critères d'un locuteur | Élargissement des critères, **journalisé avec le locuteur et le critère abandonné** | repli assumé | niveau `warn` |
| Aucune voix disponible du tout après élargissement | **échec** | **échec** | sortie d'erreur |
| Impossible d'assurer l'unicité | **échec** nommant les locuteurs en conflit | **échec** | sortie d'erreur |
| Catalogue inaccessible | **échec** | **échec** | sortie d'erreur |

L'élargissement des critères est le seul repli admis, et il est bruyant : c'est une
information de diagnostic quand une histoire sonne mal.

## Contrats

### Résultat d'attribution

Pour chaque locuteur : la voix retenue, les critères effectivement satisfaits, ceux qui ont
été abandonnés, et un niveau de confiance. Ce résultat est conservé avec l'exécution (T0104)
afin qu'une écoute décevante puisse être rattachée à une attribution douteuse.

### Invariant

L'application qui à chaque locuteur associe sa voix est injective sur une histoire donnée.

## Critères d'acceptation

1. Sur une histoire à quatre locuteurs, les quatre voix retenues sont deux à deux distinctes.
2. Le narrateur figure parmi les locuteurs et sa voix n'est celle d'aucun personnage.
3. Un même locuteur porte la même voix sur toute l'histoire, y compris à travers les blocs de
   T0204.
4. Une description contenant « woman », « princesse » ou « grand-mère » aboutit à une
   détection de genre correcte.
5. Une description contenant « mère », « père », « garçon », « frère » avec accents aboutit à
   la même détection que sa forme sans accents.
6. Quand le nombre de locuteurs excède les voix satisfaisantes disponibles, la génération
   échoue en nommant les locuteurs en conflit, sans jamais partager une voix.
7. Tout abandon de critère est journalisé au niveau `warn` avec le locuteur et le critère
   abandonné.
8. Le résultat d'attribution est conservé avec l'exécution.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 2, 3, 6 | Tests unitaires sur des scripts d'épreuve, avec un catalogue simulé |
| 4, 5 | Tests unitaires sur un jeu de descriptions couvrant les collisions et les accents |
| 7 | Test vérifiant l'émission du journal |
| 8 | Test sur le contenu du manifeste d'exécution |

Aucun critère n'exige d'accès réel au fournisseur : un catalogue simulé suffit, ce qui rend
cette tâche entièrement vérifiable hors ligne.

## Impacts

- **Traite un des quatre symptômes** ayant motivé la refonte.
- **Peut faire échouer des générations qui aboutissaient** : le critère 6 refuse ce que le
  système acceptait en partageant des voix. C'est voulu.
- **Code supprimé** : le repli sur le premier personnage du tableau.
- Aucun coût supplémentaire côté fournisseur.

## Risques et questions ouvertes

**L'unicité stricte peut être trop rigide.** Une histoire à huit personnages secondaires
épuisera vite un catalogue filtré. Le critère 6 impose l'échec plutôt que le partage, ce qui
est le bon défaut pour un produit où l'on doit distinguer les personnages — mais si l'échec
devient fréquent en usage réel, c'est le catalogue qu'il faut élargir, pas le critère
assouplir.

**La détection par mots-clés reste fruste**, même corrigée. Elle ne comprend pas « la voix
grave d'un vieil homme fatigué » autrement que par la présence de « vieil ». Le service de
correspondance non branché fait mieux ; l'utiliser ou le supprimer est tranché en T0206, et ce
choix peut rendre une partie de cette tâche caduque. **Les deux tâches doivent être décidées
ensemble.**

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
