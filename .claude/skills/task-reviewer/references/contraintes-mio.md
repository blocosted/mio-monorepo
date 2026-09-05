# Contraintes structurelles — à vérifier à chaque revue

Chaque règle correspond à un défaut réellement observé dans ce dépôt. Elles ne sont pas des
préférences de style : elles ont produit des symptômes audibles ou des risques concrets.

## 1. Frontières de couches (`CLAUDE.md`)

| Couche | Peut appeler | Ne peut pas appeler |
|--------|--------------|---------------------|
| Store | DatabaseConnection uniquement | autres stores, services, repositories, Redis |
| Repository | API externes, Logger | stores, services, autres repositories |
| Service | ses propres stores, tout service, tout repository, CacheService | les stores d'un autre scope |
| Orchestrator | idem Service | idem Service |
| Workflow | services et orchestrateurs uniquement | **stores, repositories**, handlers |
| Handler | services et workflows uniquement | **stores, repositories** |

*Historique : des violations Workflow → Store, Workflow → Repository et Handler → Store
existaient au moment de l'audit initial. Toute nouvelle occurrence est un régression.*

## 2. Aucune dépendance d'un package interne vers une app

`packages/*` ne doit jamais importer depuis `apps/*`, même en `import type`. Un cycle
`shared → api` existait au moment de l'audit ; il rend le typecheck des applications
front dépendant du graphe complet du serveur.

## 3. Rien de mort

Tout service, module ou fonction exportée introduit par la tâche doit être atteignable depuis
un handler, un workflow, un script ou un test d'intégration. Vérifie-le par recherche, pas
par intuition.

*Historique : plus de 1 000 lignes de services soignés (matching de voix, batching TTS,
stratégie musicale) n'étaient jamais appelées. Le pipeline en production empruntait
systématiquement le chemin le plus naïf.*

## 4. Aucun échec silencieux

Toute valeur de repli doit être :
- soit **interdite** par la spec, et alors on échoue franchement avec une erreur nommée,
- soit **assumée**, et alors elle est journalisée au niveau `warn` avec le contexte qui
  permet de la diagnostiquer.

Cherche spécifiquement : les `?? 0`, les `?? valeurDefaut`, les `catch` qui renvoient une
valeur, les accès à un dictionnaire par clé dynamique sans vérification d'existence.

*Historique : une ancre de timing introuvable renvoyait `0` (tous les sons s'empilaient au
début), une ambiance inconnue retombait sur `forest`, une émotion non reconnue devenait
`neutral`. Trois défauts invisibles dans les logs et parfaitement audibles.*

## 5. Une seule source de vérité par donnée

Pas deux tables de constantes pour la même chose, pas deux calculs du même temps, pas deux
définitions du même niveau sonore. Si la tâche introduit une valeur qui existe déjà ailleurs,
elle doit référencer l'existante ou supprimer l'ancienne.

*Historique : deux tables `DEFAULT_VOLUMES` contradictoires ; le volume appliqué deux fois
(au rendu puis au mixage) donnant une musique à −21 dB au lieu de −10.*

## 6. L'audio fait foi

Aucune durée ne doit être prédite puis utilisée pour positionner de l'audio. On génère, on
mesure (`ffprobe`), et la timeline se déduit de la mesure.

*Historique : la timeline était calculée à partir de la fin du dernier caractère prononcé,
tandis que le mixage concaténait les fichiers réels. L'écart s'accumulait et atteignait
plusieurs secondes en fin d'histoire.*

## 7. Validation d'entrée aux frontières

Tout ce qui entre dans le système depuis l'extérieur — requête HTTP, réponse d'un LLM,
réponse d'une API tierce — est validé à l'exécution, pas seulement typé. Un `as Type` sur une
réponse de LLM n'est pas une validation.

*Historique : `parseScriptResponse` faisait `obj.tracks as StoryScript['tracks']`, laissant
passer des références croisées invalides et des émotions inconnues.*

## 8. Bornes sur les entrées utilisateur

Toute chaîne acceptée d'un client a une longueur maximale, tout tableau a un cardinal
maximal — en particulier lorsque le contenu finit interpolé dans un prompt LLM.

## 9. Documentation à jour

Si la tâche déplace un fichier, renomme une couche ou change une convention, `CLAUDE.md` est
mis à jour dans le même commit. Une documentation qui décrit une arborescence disparue est
pire que pas de documentation.
