# Glossaire (génération d’histoires)

## Concepts d’entrée

- **Initial prompt**: idée courte (1–2 phrases) qui déclenche la création d’une histoire (ex: “Un enfant trouve une porte dans un arbre.”).
- **Enrichment profile**: profil minimal de l’enfant utilisé pour personnaliser l’histoire (âge, prénom, langue, thèmes à inclure/éviter, etc.).
- **Vocabulary level**: niveau de vocabulaire déduit de l’âge (ex: `very_simple`, `simple`, `medium`, `advanced`).
- **Guided questions / answers**: choix guidés (format JSON) pour orienter des éléments créatifs (ex: fin “happy”, thème “dragons”…).

## Concepts de sortie (enrichissement)

- **Enriched concept (`EnrichedConcept`)**: concept structuré généré par le LLM à partir du prompt initial (titre, personnages, décor, tonalité, thèmes, synopsis).
  - **Objectif**: transformer une idée floue en spécification narrative exploitable par la génération de script.

## Concepts de sortie (script)

- **Story script (`StoryScript`)**: format de script **timeline-based**, conçu pour l’audio.
  - **Improvements**: permettre un meilleur contrôle de durée (budget de mots) et une meilleure compatibilité avec les contraintes “audio” (SFX, musique, tags).

- **Tracks**: pistes audio logiques (ex: `voice`, `sfx`, `music`, `ambiance`).
  - **Voice track**: narration + dialogues (contenu textuel à synthétiser).
  - **SFX track**: effets sonores (descriptions en anglais pour les générateurs SFX).
  - **Music track**: ambiance musicale (moods, transitions).

- **Timeline segment (`TimelineSegment`)**: bloc positionné dans le temps, avec:
  - `startTime`: position absolue (en secondes depuis le début)
  - `duration`: durée du segment
  - `content`: contenu (narration/dialogue/sfx/music/ambiance)

- **ElevenLabs audio tags**: tags intégrés dans le texte, entre crochets, pour guider l’expressivité (ex: `[whispering]`, `[laughs]`).

## Qualité & fiabilité

- **Duration budget**: découpe de la durée cible en budgets (voix / SFX / transitions musique / pauses) et conversion en **budget de mots** (base: 150 mots/min).
- **Validation**: contrôles automatiques sur:
  - le nombre de mots,
  - le minimum de segments narration/dialogue/SFX,
  - la cohérence de la timeline (pas d’overlap sur la piste voix).
- **Retry with feedback**: si la validation échoue, on regénère en donnant au LLM un feedback explicite (ex: “ajoute X mots”, “plus de narration”, etc.).

## Artifacts (exécutions locales)

- **Run store**: stockage local des entrées/sorties de la CLI dans `.mio-data/` (gitignored), pour déboguer et rejouer.
  - `input.json`: entrée effective
  - `prompts.json`: prompts calculés (system/user) + contraintes
  - `output.json`: résultat (concept enrichi / script + validation)
  - `meta.json`: métadonnées d’exécution (date, profil, etc.)
  - `error.json`: détail d’erreur en cas d’échec

