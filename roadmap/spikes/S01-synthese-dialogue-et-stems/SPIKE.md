---
id: S01
titre: Synthèse de dialogue en une passe, bruitages en ligne, stems séparés
statut: en-cours
date_debut: 2026-09-05
time_box: 6h
concerne: [E01, E02, E03, E04]
research: [2026-09-05-elevenlabs-refonte-audio]
---

# S01 — Synthèse de dialogue en une passe, bruitages en ligne, stems séparés

## Question

Sur une même scène, l'architecture envisagée — synthèse multi-voix en une passe, bruitages
portés par le script, musique en un morceau, mixage de trois stems — produit-elle un résultat
meilleur que le pipeline actuel, et permet-elle de supprimer tout placement temporel côté Mio ?

La question se décompose en quatre axes qui peuvent conclure séparément. **C'est délibéré :
un verdict global unique masquerait le cas le plus probable, où la voix convainc et les
bruitages non.**

## Pourquoi on ne peut pas trancher sur documentation

`research/2026-09-05-elevenlabs-refonte-audio` a établi ce qui est annoncé, mais **aucun fait
n'a pu être vérifié à la source** : le domaine du fournisseur est bloqué par le proxy réseau.
Surtout, la question décisive n'est pas documentée nulle part : *un bruitage demandé dans le
texte est-il réellement produit, et à quelle fréquence ?* Les retours d'usage vont de
« fonctionne bien » à « une fois sur six ». Aucune page ne répondra ; un appel réel, oui.

Deuxième raison : toutes les sources portent sur l'anglais. Le contenu de Mio est
majoritairement francophone, et rien ne dit que les tags se comportent pareil.

## Hypothèse

Écrite avant l'expérience, pour pouvoir se tromper honnêtement.

- **Axe A — voix :** nette amélioration. Les blancs et la prosodie sont structurellement
  meilleurs quand les répliques sont générées ensemble.
- **Axe B — bruitages :** c'est là que ça casse. J'attends un taux de déclenchement entre
  50 % et 80 %, insuffisant pour un produit, et probablement plus bas en français.
- **Axe C — musique :** sans surprise, nettement meilleur qu'une boucle de clip court.
- **Axe D — mixage :** trivial une fois les stems de même durée.

## Matériel d'entrée

Une **scène unique**, figée dans un fichier et réutilisée à l'identique dans toutes les
générations — c'est ce qui rend les comparaisons valides.

- extraite d'une histoire déjà générée, pour que la comparaison porte sur le procédé et non
  sur le texte
- narrateur + 2 personnages, 10 à 14 tours de parole, 1 200 à 1 800 caractères — sous la
  limite d'une requête, pour isoler la question du découpage
- **5 bruitages** insérés dans le texte à des moments identifiables à l'oreille
- en français

## Protocole

### Préalable (30 min)

Vérifier que `analyse-audio.ts` produit des mesures correctes sur un fichier réel. S'il
échoue, le corriger sur place : c'est le prérequis de toute mesure, et ça vaut vérification
partielle de T0101.

### Axe A — voix (90 min)

1. Récupérer le **stem voix de l'histoire d'origine** (assets déjà stockés) → référence `A`.
2. Générer la même scène en une passe multi-voix → `B`.
3. Mesurer `A` et `B` avec `audio-qa`.
4. Écouter en A/B rapproché selon le protocole d'écoute, passes 2 et 4.

### Axe B — bruitages (120 min)

1. Générer **10 fois** la même scène, avec 10 graines différentes.
2. Pour chaque génération et chacun des 5 bruitages : le son est-il produit ? (oui / non /
   produit mais méconnaissable)
3. Pour ceux qui sont produits : écart entre la position entendue et le mot visé.
4. Calculer le **taux de déclenchement** = sons reconnaissables / 50 tentatives.
5. Rejouer 3 générations avec les tags en anglais dans un texte français, pour isoler l'effet
   de langue.

### Axe C — musique (60 min)

1. Mesurer la durée réelle de `B` avec `ffprobe`.
2. Générer un morceau instrumental de cette durée exacte.
3. Mesurer : durée obtenue, discontinuités d'amplitude, niveau intégré.
4. Écouter en entier — chercher spécifiquement un motif qui redémarre.

### Axe D — mixage (30 min)

1. Assembler `B` + musique en une commande `ffmpeg` : volumes, atténuation sous la voix,
   masterisation.
2. Mesurer le mix avec `audio-qa` contre `charte.json`.
3. Écouter en conditions réelles, protocole passe 1.

### Relevé transverse

Coût total en caractères et en appels, et durée de chaque génération. Alimente l'estimation
du coût par histoire et le critère de E01.

## Critère de décision

Écrit **avant** l'expérience. Chaque axe conclut indépendamment.

### Axe A — voix
- **Adopté si** `B` respecte les seuils de blancs de `charte.json` (médiane, p90, maximum)
  **et** est meilleur que `A` sur la médiane **et** sur le p90, **et** qu'à l'écoute A/B la
  version `B` est préférée sans hésitation.
- **Rejeté si** `B` ne respecte pas les seuils, ou n'est pas préférée à l'écoute.
- **Non concluant si** les mesures s'améliorent mais l'écoute ne tranche pas → refaire sur une
  deuxième scène avant de décider.

### Axe B — bruitages
- **Adopté si** taux de déclenchement **≥ 80 %** et écart de position **≤ 300 ms** sur les
  sons produits.
- **Repli si** taux entre **50 % et 80 %** : les bruitages repassent sur une piste séparée
  placée par Mio, adossée à l'alignement horodaté réel. E03 est réécrit en conséquence.
- **Rejeté si** taux **< 50 %**, ou si les sons produits sont méconnaissables. Même
  conséquence que le repli, sans ambiguïté.

*Ce critère décide seul du sort du critère de sortie n° 4 de E03.*

### Axe C — musique
- **Adopté si** durée obtenue à **± 2 s** de la demande, aucune discontinuité mesurable, et
  aucun motif de reprise identifié à l'écoute.
- **Rejeté si** la durée n'est pas tenue, ou si une reprise est audible.

### Axe D — mixage
- **Adopté si** le mix respecte le niveau intégré, le true peak et l'absence d'écrêtage de
  `charte.json` avec une seule commande `ffmpeg`, sans placement ni concaténation.
- **Rejeté si** un placement temporel s'avère nécessaire pour obtenir un résultat correct.

### Règle globale

**A et D adoptés** suffisent à valider la refonte : c'est là que se joue la suppression du
moteur de timeline. B et C ajustent le contenu de E03, pas la direction générale.

**Si A est rejeté**, tout s'arrête : on retombe sur le plan de correction du pipeline
existant (mesurer les durées réelles avant de calculer la timeline), et E02 à E04 sont
réécrits.

## Hors périmètre

Aucune intégration au workflow, aucune persistance en base, aucune interface, aucun test,
aucune abstraction. Le code vit dans `packages/scripts/src/spikes/S01/` et n'est appelé par
rien.

## Time-box

**6 heures.** Au-delà, on s'arrête et on conclut avec ce qu'on a.

Les axes sont ordonnés par pouvoir de décision : si le temps manque, **A et B suffisent** —
A décide de la direction, B décide du contenu de E03. C et D sont à faible risque et peuvent
attendre.

Le dépassement de la durée est une donnée à noter dans le verdict, pas un échec.

## Prérequis

- `ffmpeg` et `ffprobe` installés
- une clé d'API valide, sur une offre payante (la génération musicale l'exige)
- le stem voix d'une histoire déjà générée, pour la référence de l'axe A
