---
id: T0203
epic: E02
titre: Synthèse multi-voix en une passe
statut: specifiee
type: refonte
depend_de: [T0200, T0201, T0202]
adr: [ADR-0001]
research: [2026-09-05-elevenlabs-refonte-audio]
hypotheses: [S01-axe-A]
effort: L
---

# T0203 — Synthèse multi-voix en une passe

## Problème

Chaque réplique est synthétisée par un appel isolé
(`voice-generation.orchestrator.ts:170-176`), uploadée séparément (`:179-181`), puis les
fichiers sont recollés par concaténation avec des silences intercalés
(`ffmpeg-mixer.service.ts:358-407`).

Trois symptômes en découlent, et aucun ne se corrige sans changer ce point :

**Les tons sont plats.** Chaque appel repart de la prosodie neutre du modèle. Le dépôt sait
pourtant transmettre le contexte amont et aval — `generateSpeech` accepte ces paramètres et le
dépôt les relaie — mais l'orchestrateur ne les passe jamais. Rien ne relie une réplique à la
précédente.

**Les blancs sont artificiels et inégaux.** Le silence entre deux répliques est la somme du
silence de queue du fichier précédent, d'un silence généré, et du silence d'attaque du suivant.
Aucun de ces trois termes n'est maîtrisé.

**Le temps dérive.** La durée stockée vient de la fin du dernier caractère prononcé
(`audio.repository.ts:161-167`), alors que le mixage concatène les fichiers réels : l'écart
s'accumule à chaque réplique.

Un service de regroupement de répliques existe et n'est jamais appelé
(`tts-batch.service.ts`, 345 lignes) ; sa propre documentation décrit le défaut qu'il devait
corriger.

## Objectif

Les répliques d'un même bloc sont synthétisées ensemble, et leurs bornes réelles sont connues
sans être calculées.

## Périmètre

**Dans :**
- La synthèse d'une suite de tours en un seul appel, avec leurs locuteurs
- La récupération des bornes réelles de chaque tour, telles que rendues par le fournisseur
- La conservation de ces bornes comme unique référence temporelle du reste du pipeline
- La transmission de l'intention de jeu de chaque tour
- La suppression de la synthèse par réplique et de la concaténation qui la suivait

**Hors :**
- Le découpage en blocs quand le script dépasse la limite d'une requête — T0204
- L'attribution des voix aux locuteurs — T0205
- Le placement des bruitages sur les bornes obtenues — E03
- Le mixage — E04

## Comportement attendu

### Cas nominal

Une suite de tours est envoyée en une fois. Le résultat est un stem vocal unique, accompagné,
pour chaque tour, de ses bornes de début et de fin **mesurées sur l'audio produit**.

Ces bornes deviennent la seule référence temporelle du pipeline. Aucun consommateur en aval ne
recalcule ni ne prédit un temps.

L'intention de jeu portée par chaque tour est transmise au fournisseur sous la forme qu'il
attend, sans transformation silencieuse : si une intention ne peut pas être transmise, c'est
une erreur, pas un abandon discret.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Un seul tour | Fonctionne : le cas dégénéré n'est pas un cas particulier |
| Deux tours consécutifs du même locuteur | Fonctionne, sans blanc artificiel inséré entre eux |
| Le nombre de locuteurs distincts dépasse ce que le fournisseur admet | Échec explicite nommant la limite et le nombre atteint, avant tout appel |
| Un tour cite un locuteur sans voix attribuée | Échec explicite : c'est un défaut de T0205, pas un cas à rattraper ici |
| Le fournisseur rend moins de bornes que de tours envoyés | Échec : un décalage silencieux entre tours et bornes reproduirait exactement le défaut qu'on supprime |
| Le fournisseur rend des bornes non croissantes | Échec |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| L'appel échoue | Reprise selon la politique existante, puis échec | **échec** | journal et état du travail |
| Les bornes sont absentes de la réponse | **Échec.** Sans elles, tout le reste du pipeline redevient de la prédiction | **échec** | sortie d'erreur |
| Le nombre de bornes ne correspond pas au nombre de tours | **échec** | **échec** | sortie d'erreur |
| Une intention de jeu n'est pas transmissible | **échec** nommant le tour et l'intention | **échec** | sortie d'erreur |

Aucun repli. Une synthèse dont on ne connaît pas les bornes n'est pas exploitable : la laisser
passer ramènerait le système au modèle temporel qu'ADR-0001 abandonne.

## Contrats

### Résultat de synthèse

Un stem vocal, et pour chaque tour du bloc : son identifiant, son locuteur, sa borne de début
et sa borne de fin en secondes, telles que rendues par le fournisseur. Ces valeurs ne sont
jamais recalculées, arrondies ou complétées.

Le résultat porte aussi la graine utilisée, afin qu'une régénération à l'identique soit
possible.

### Invariant

Pour tout tour, la borne de fin est supérieure ou égale à la borne de début, et les tours se
succèdent sans chevauchement. Un résultat qui viole cet invariant est rejeté.

## Critères d'acceptation

1. Une suite de tours produit un stem unique et une borne de début et de fin par tour.
2. Les bornes rendues proviennent du fournisseur et ne sont ni recalculées ni ajustées.
   Vérifiable par lecture du code.
3. Un écart entre le nombre de tours envoyés et le nombre de bornes reçues fait échouer la
   synthèse.
4. Des bornes non croissantes ou se chevauchant font échouer la synthèse.
5. Sur une scène de référence, les blancs internes du stem respectent les seuils de
   `charte.json`, mesurés par `audio-qa`.
6. Sur la même scène, les blancs sont meilleurs qu'avec la synthèse par réplique, sur la
   médiane et sur le 90ᵉ centile.
7. La synthèse par réplique et la concaténation par silences générés n'existent plus.
8. Deux synthèses de la même scène avec la même graine produisent des bornes dont l'écart
   reste sous une tolérance déclarée.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 3, 4 | Tests d'intégration avec un fournisseur simulé rendant des réponses défectueuses |
| 2, 7 | Lecture du code |
| 5, 6 | Mesure `audio-qa` sur la scène de référence, comparée via T0105 |
| 8 | Deux générations réelles avec la même graine |

Les critères 5, 6 et 8 exigent un accès réel au fournisseur.

## Impacts

- **Traite trois des quatre symptômes** ayant motivé la refonte.
- **Code supprimé** : la synthèse par réplique, la concaténation par silences, le calcul de
  pauses, et le service de regroupement jamais appelé.
- **Coût** : une histoire consomme le même volume de caractères, mais une reprise en consomme
  davantage puisqu'elle porte sur un bloc entier. À mesurer via T0106.
- **Change la granularité de reprise**, conséquence acceptée par ADR-0001.

## Risques et questions ouvertes

**Cette spec repose sur une hypothèse non levée.** Si l'axe A de S01 est rejeté, ADR-0001
devient obsolète et cette tâche disparaît au profit de l'option B. À relire dès le verdict.

**Le fournisseur ne garantit pas le déterminisme**, même à graine constante. Le critère 8
impose une tolérance déclarée plutôt qu'une égalité ; **la valeur de cette tolérance reste à
établir par mesure**, et elle conditionne l'utilité du banc d'essai : trop de dispersion et
comparer deux rendus perd son sens.

**Les intentions de jeu ne sont pas garanties.** La veille établit que les marqueurs
d'intention dépendent de la voix et sont d'efficacité irrégulière. Le critère 5 porte sur les
blancs, mesurables ; la justesse du ton reste un jugement d'écoute, hors de portée d'un
critère chiffré. C'est une limite assumée de cette spec.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
