---
name: audio-qa
description: Mesure objectivement la qualité d'un rendu audio Mio (niveau, dynamique, écrêtage, distribution des blancs, équilibre des stems), le confronte à la charte sonore et produit une fiche d'écoute datée dans roadmap/audio/. Utilise ce skill dès qu'il est question d'écouter, de juger ou de comparer un rendu, quand l'utilisateur dit que « ça sonne mal », « c'est mieux ? », « écoute ça », veut comparer deux versions ou se comparer à une référence commerciale, et systématiquement à la fin d'une tâche touchant à l'audio ou d'un spike audio. Utilise-le aussi pour établir ou réviser la charte sonore.
---

# Audio QA

Tu transformes « ça sonne mal » en chiffres, et « c'est mieux » en preuve.

Lis `roadmap/CONVENTIONS.md`. Les seuils de référence sont dans `roadmap/audio/charte.json`
et leur justification dans `roadmap/PRODUIT.md`. Si la charte n'existe pas, crée-la (voir
plus bas) — c'est le premier travail à faire, tout le reste en dépend.

## Pourquoi ce skill existe

L'objectif du projet est une qualité d'écoute comparable à des histoires audio commerciales.
Une ambition formulée ainsi n'est pas actionnable : on ne sait pas si on s'en rapproche, on
ne sait pas si une modification a amélioré ou dégradé, et on finit par juger à l'humeur du
jour. Ce skill donne un référentiel stable.

Deux choses qu'il ne fait pas, et c'est volontaire :

- **Il ne remplace pas l'oreille.** Les mesures attrapent les régressions et les défauts
  systématiques ; elles ne disent pas si une voix est juste ou si un enfant s'endort. Chaque
  fiche a une partie mesurée et une partie écoutée, et la seconde n'est pas facultative.
- **Il ne juge pas le contenu.** Un texte plat correctement mixé passe toutes les mesures.

## Prérequis

`ffmpeg` et `ffprobe` doivent être installés. Vérifie-le avant de commencer :
`ffmpeg -version`. S'ils manquent, dis-le et arrête-toi : aucune mesure n'est possible, et
inventer des chiffres serait pire que ne rien produire.

## Ce qu'on mesure, et pourquoi

| Mesure | Ce qu'elle attrape | Pourquoi ça compte ici |
|---|---|---|
| **LUFS intégré** | volume perçu moyen | Une histoire plus forte que la précédente réveille l'enfant. La constance entre histoires compte plus que la valeur absolue. |
| **True peak (dBTP)** | saturation inter-échantillon | Se traduit en craquements sur les petits haut-parleurs, qui n'ont aucune marge. |
| **LRA** (plage de loudness) | écart entre les passages doux et forts | Pour ce produit, une dynamique large est un **défaut** : le parent monte le son pour entendre le murmure, puis le cri fait sursauter. |
| **Marge de sursaut** (pic court terme − intégré) | les à-coups ponctuels | Complète le LRA, qui est une statistique globale et peut masquer un seul sursaut violent. |
| **Écrêtage** (échantillons en crête, facteur de platitude) | distorsion numérique | Trahit une somme de pistes sans marge — le défaut typique d'un `amix` sans réduction. |
| **Distribution des blancs** (médiane, p90, max, part de silence) | le montage | C'est la mesure qui rend visible « les blancs sont mal gérés ». Un p90 à 1,8 s trahit un montage haché bien avant qu'on sache l'expliquer. |
| **Silence de tête / queue** | l'amorce et la chute | Une histoire qui démarre net ou se coupe sec s'entend immédiatement. |
| **Équilibre des stems** | le rapport voix / musique / ambiance | Mesuré en analysant chaque stem isolément. C'est ce qui distingue « la musique est trop forte » de « la musique est inaudible ». |

## Méthode

### 1. Vérifier la charte

Si `roadmap/audio/charte.json` n'existe pas, crée-la à partir des valeurs par défaut du
script, et écris dans `roadmap/PRODUIT.md` la section qui les justifie. Présente-les
explicitement comme **des hypothèses à valider à l'oreille**, pas comme des vérités : les
normes de diffusion existantes visent le podcast ou la radio, pas une histoire du soir
écoutée à faible volume dans une chambre. Elles seront ajustées après les premières écoutes.

Les seuils vivent dans le JSON, leur justification dans le Markdown. Ne recopie pas les
chiffres dans les deux — c'est la règle de source unique de `CONVENTIONS.md` §5.

### 2. Mesurer

```bash
bun .claude/skills/audio-qa/scripts/analyse-audio.ts <fichier> --charte roadmap/audio/charte.json
```

Le script renvoie du JSON : format, loudness, statistiques, blancs, et le verdict de chaque
critère face à la charte.

Mesure **le mix final et chaque stem séparément** quand ils sont disponibles. C'est
indispensable : un mix conforme peut cacher une musique 20 dB trop basse, et seule l'analyse
des stems isolés le révèle. Calcule l'écart de LUFS intégré entre stems — c'est ce chiffre,
en LU, qui exprime l'équilibre.

### 3. Comparer

Deux comparaisons, toutes deux utiles :

- **À la version précédente** — c'est ce qui prouve qu'une modification améliore. Sans ce
  point de comparaison, on ne fait que des impressions.
- **À une référence commerciale** — mesure une histoire audio du commerce que tu possèdes,
  range le résultat dans `roadmap/audio/references/`. C'est ainsi que « qualité
  professionnelle » cesse d'être une opinion : on sait à quels chiffres ça correspond
  réellement, et souvent ils surprennent.

Constituer deux ou trois références est un investissement d'une heure qui sert pendant tout
le projet. Propose-le si ce n'est pas fait.

### 4. Écouter

Les mesures ne suffisent pas. Suis `references/protocole-ecoute.md` : il fixe l'ordre, le
matériel et ce qu'on cherche à chaque passe. Une écoute structurée trouve des choses qu'une
écoute distraite manque, et elle est reproductible d'une version à l'autre.

Remplis la partie subjective de la fiche avec des **observations horodatées**
(« à 2:14, la transition vers la grotte coupe net ») plutôt que des jugements globaux. Un
horodatage se vérifie et se corrige ; « c'est bof » ne se traite pas.

### 5. Écrire la fiche

`roadmap/audio/<story-id>/<YYYY-MM-DD>-fiche-ecoute.md`.

```markdown
---
story_id: <id>
date: 2026-09-05
fichier: <chemin ou url>
version: <commit, branche ou tâche>
compare_a: <fiche précédente, ou référence>
---

# Fiche d'écoute — <titre> (<date>)

## Verdict
**<n> critères hors charte** · <une phrase>

## Mesures

| Critère | Valeur | Attendu | Statut | Écart vs version précédente |
|---------|--------|---------|--------|------------------------------|

## Équilibre des stems

| Stem | LUFS intégré | Écart / voix |
|------|--------------|--------------|

## Écoute
<Observations horodatées. Ce qui gêne, ce qui fonctionne. Ne saute pas ce qui fonctionne :
c'est ce qui empêche de casser en croyant améliorer.>

| Temps | Observation | Gravité |
|-------|-------------|---------|

## Hypothèses de cause
<Pour chaque défaut entendu, la cause probable dans le pipeline, avec `fichier.ts:ligne` si
tu peux la localiser. C'est ce qui transforme une fiche en tâche.>

## Suites proposées
<Tâches à créer ou specs à corriger.>
```

## Interpréter les résultats

**Un mix conforme qui sonne mal**, c'est le cas intéressant : la charte est incomplète.
Cherche quelle grandeur aurait attrapé ce que tu as entendu, et propose de l'ajouter. C'est
ainsi que la charte devient bonne.

**Un mix hors charte qui sonne bien** arrive aussi — souvent sur le LUFS intégré, dont la
cible est conventionnelle. Ajuste le seuil, ne force pas le mix.

**Ne poursuis jamais un chiffre au détriment de l'écoute.** La charte est un filet, pas un
objectif. Son rôle est d'attraper les régressions, pas de définir le beau.

## En terminant

Présente : le nombre de critères hors charte, les trois défauts les plus gênants à l'écoute
avec leur horodatage, et l'écart avec la version précédente. Si des tâches en découlent,
nomme-les — mais laisse `task-specifier` les spécifier.
