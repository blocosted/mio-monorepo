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

*Historique : 748 lignes de services soignés n'étaient jamais appelées — le matching de voix
(403 l.) et le batching TTS (345 l.), seulement ré-exportés et couverts par un test unitaire.
Le pipeline en production empruntait systématiquement le chemin le plus naïf.*

*Attention au faux positif symétrique : la stratégie musicale (304 l.) semblait morte au même
titre, mais elle est instanciée par les scripts (`packages/scripts/src/mix/mix-story.ts:264`)
et liée dans le conteneur. Elle est absente du chemin de production de l'API, ce qui est un
autre défaut et appelle une autre correction — brancher, pas supprimer. Vérifie toujours les
scripts et les liaisons du conteneur avant de conclure à du code mort.*

## 4. Aucun échec silencieux

Toute valeur de repli doit être :
- soit **interdite** par la spec, et alors on échoue franchement avec une erreur nommée,
- soit **assumée**, et alors elle est journalisée au niveau `warn` avec le contexte qui
  permet de la diagnostiquer.

Cherche spécifiquement : les `?? 0`, les `?? valeurDefaut`, les `catch` qui renvoient une
valeur, les accès à un dictionnaire par clé dynamique sans vérification d'existence.

*Historique : une ancre de timing introuvable renvoyait `0` (tous les sons s'empilaient au
début), une ambiance inconnue retombait sur `forest`, une émotion non reconnue perdait son
tag et ses réglages. Trois défauts parfaitement audibles, dont deux muets : seule l'ancre
introuvable était journalisée en `warn` (`timeline-computation.service.ts:414`) — ce qui n'a
servi à rien, personne ne lisant le journal. Un `warn` que personne ne lit n'est pas une
alerte ; ne t'en contente pas pour un repli qui s'entend.*

*Autres replis muets recensés dans le même dépôt, à ne pas rejouer : un ton inconnu qui
retombe sur `Tone.Adventurous` (`llm.service.parser.ts:188`), un texte de dialogue sans
guillemets reconnus dont la didascalie part telle quelle à la synthèse
(`tts-text-extractor.ts:141`), un segment vocal sans timing placé à 0 s
(`timeline-computation.service.ts:332`), un asset de bruitage introuvable silencieusement
retiré du mix (`story-generation.workflow.steps.ts:459`) alors que le même cas sur la voix
lève une erreur.*

## 5. Une seule source de vérité par donnée

Pas deux tables de constantes pour la même chose, pas deux calculs du même temps, pas deux
définitions du même niveau sonore. Si la tâche introduit une valeur qui existe déjà ailleurs,
elle doit référencer l'existante ou supprimer l'ancienne.

*Historique : **quatre** sources de volume par défaut, contradictoires deux à deux — deux
tables `DEFAULT_VOLUMES` (`ffmpeg-mixer.service.constants.ts:25`,
`story-mixing.orchestrator.ts:27`) et deux jeux de valeurs par défaut dans les générateurs
(`audio-generation.orchestrator.ts:88`, `music-generator.service.ts:56`). Le volume appliqué
deux fois, au rendu puis au mixage, donnait une musique à −21 dB au lieu de −10. Quand tu
cherches une valeur dupliquée, ne t'arrête pas à la deuxième occurrence.*

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
