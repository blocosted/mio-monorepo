---
id: ADR-0001
titre: Faire porter le temps de la voix par le fournisseur, et placer le reste sur des bornes mesurées
statut: accepte
date: 2026-09-05
concerne: [E01, E02, E03, E04]
sources: [2026-09-05-elevenlabs-refonte-audio, S01-synthese-dialogue-et-stems]
---

# ADR-0001 — Qui porte le temps dans le pipeline audio

## Statut

**accepté** — 5 septembre 2026.

Accepté sur preuve documentaire, avant exécution du spike. **L'axe A de S01 reste le test de
cette décision** : s'il est rejeté, cet ADR devient obsolète et l'option B s'applique. Le
paragraphe « Ce qui nous ferait revenir dessus » est donc actif dès maintenant, et non
seulement à terme.

## Contexte

Le rendu audio est jugé décevant sur quatre points : blancs mal gérés, tons plats, sons
d'ambiance mal placés, musique de mauvaise qualité. L'audit a montré qu'ils ont une cause
commune, et qu'elle est de conception, pas de réglage.

**Le système prédit des durées, puis fabrique de l'audio censé y correspondre.** La timeline
est construite en cumulant une durée issue de la fin du dernier caractère prononcé
(`audio.repository.ts:161`), tandis que le mixage concatène les fichiers réels
(`ffmpeg-mixer.service.ts:358`). Les deux ne coïncident pas, et l'écart s'accumule à chaque
segment. Les bruitages, placés aux temps de la première horloge, dérivent d'autant.

Ce n'est pas un bug isolé : c'est l'inversion du principe qui devrait gouverner un pipeline
audio. Trois défauts distincts en découlent mécaniquement — la dérive, deux désynchronisations
d'index sur la carte des pauses, et un segment orphelin placé à zéro seconde. Les corriger un
par un laisserait la cause en place.

Deux faits établis par la veille bornent le choix, et le second a changé la réponse :

- **La synthèse multi-voix en une passe existe** et supprime par construction la
  concaténation, les pauses calculées et l'isolement prosodique de chaque réplique. C'est ce
  qui traite les blancs et les tons, que la seule correction de la dérive ne toucherait pas.
- **La réponse horodatée contient `voiceSegments[]`** : pour chaque tour du script, la voix,
  les bornes en secondes et l'index du tour d'origine — issus de l'audio réellement produit.
  Ce fait n'était pas connu quand la refonte a été envisagée, et il rend une troisième voie
  possible.

Contrainte tierce : l'éditeur du fournisseur **déconseille les tags de bruitage dans son
propre outil de production**. Confier au fournisseur le placement des bruitages n'est donc
pas une option raisonnable, alors que c'était l'hypothèse de départ.

## Options envisagées

### Option A — Délégation totale
- **En quoi ça consiste :** le fournisseur porte tout le temps. Voix et bruitages générés
  ensemble par des tags en ligne, musique en morceau pleine longueur, mixage réduit à
  l'empilement de stems de même durée. Mio ne calcule plus aucun temps.
- **Ce que ça apporte :** la suppression la plus radicale — le moteur de timeline, le calcul
  de pauses, le placement, la table de timelines, soit environ 2 500 lignes.
- **Ce que ça coûte :** le placement des bruitages devient invérifiable et non reproductible,
  précisément là où le fournisseur déconseille son propre mécanisme. Aucun recours si un son
  n'est pas produit.
- **Pourquoi on ne la retient pas :** elle fait dépendre une partie audible du produit d'une
  fonctionnalité que le fournisseur lui-même juge inapte à la production.

### Option B — Mesurer puis dériver, sur l'architecture actuelle
- **En quoi ça consiste :** garder la synthèse segment par segment, mais mesurer la durée
  réelle de chaque fichier après génération, puis calculer la timeline à partir de ces
  mesures, puis placer.
- **Ce que ça apporte :** supprime la dérive sans nouvelle dépendance. Conserve la
  granularité de reprise par segment et le contrôle total du placement. C'est la correction
  minimale et la moins risquée.
- **Ce que ça coûte :** ne traite **aucun** des trois symptômes principaux. Les blancs
  restent artificiels, la prosodie reste plate parce que chaque réplique est synthétisée
  isolément, les voix restent indistinctes. Conserve le moteur de timeline et sa complexité.
- **Pourquoi on ne la retient pas :** elle corrige la synchronisation et laisse le produit
  décevant. C'est cependant **le repli si l'axe A du spike échoue**.

### Option C — Le fournisseur porte le temps de la voix, Mio place le reste sur des bornes mesurées — **retenue**
- **En quoi ça consiste :** la voix est générée en une passe multi-voix ; `voiceSegments[]`
  donne les bornes réelles de chaque réplique ; Mio place les bruitages et l'ambiance sur ces
  bornes ; la musique est un stem pleine longueur ; le mixage empile des stems de même durée.
- **Ce que ça apporte :** tous les bénéfices de A sur la voix — blancs, prosodie, distinction
  des personnages — sans lui céder le placement des bruitages. Et surtout : **placer redevient
  sûr**, puisqu'on place sur du mesuré et non sur du prédit. La dérive disparaît sans qu'on
  renonce au contrôle.
- **Ce que ça coûte :** conserve une logique de placement, donc du code. Mais une logique qui
  ne prédit plus rien : elle consomme des bornes fournies avec l'audio.

### Option D — Statu quo corrigé bug par bug
- **En quoi ça consiste :** garder l'architecture et corriger les défauts un par un.
- **Ce que ça apporte :** aucun changement de dépendance, aucune migration. Il faut lui
  reconnaître ce qu'elle offre réellement : une régénération à la granularité du segment, et
  un contrôle complet sur chaque son.
- **Pourquoi on ne la retient pas :** la cause étant l'inversion du modèle temporel, chaque
  correction locale rouvre le problème ailleurs. Les deux désynchronisations d'index sur la
  même donnée illustrent le mécanisme.

## Décision

**Option C.**

L'argument décisif est unique et il est récent : `voiceSegments[]` supprime l'arbitrage entre
déléguer et contrôler. Avant de le connaître, il fallait choisir entre une bonne prosodie
sans maîtrise du placement (A) et un placement maîtrisé sur une voix médiocre (B). Puisque le
fournisseur livre les bornes réelles de chaque réplique **avec** l'audio, on obtient les deux.

Le principe qui en découle est celui déjà inscrit dans les conventions, et il devient
opérationnel : **l'audio fait foi, la timeline se déduit de la mesure, jamais l'inverse.**

## Conséquences acceptées

- **Dépendance forte à un fournisseur unique pour la voix.** Le format des tours et
  `voiceSegments[]` sont propriétaires ; aucune abstraction crédible ne les rendra
  interchangeables. Un changement de fournisseur serait une réécriture, pas un remplacement
  d'implémentation.
- **Granularité de reprise dégradée.** Une réplique ratée impose de régénérer un bloc
  d'environ 2 000 caractères, et le modèle n'étant pas déterministe, le reste du bloc bougera.
  La graine atténue sans garantir.
- **Le raccord entre blocs est entièrement à notre charge**, sans aucun filet du fournisseur :
  la couture entre requêtes n'existe pas sur ce modèle. C'est le risque de qualité non résolu
  de cette décision, et il n'a pas d'équivalent dans les options A ou B.
- **Traitement des données hors Union européenne** par défaut, et entraînement du fournisseur
  sur les données envoyées sauf refus explicite. Pour un produit destiné à des enfants, cela
  mérite sa propre décision — elle est ouverte, distincte de celle-ci.
- **Offre payante obligatoire**, la génération musicale l'exigeant.
- **Coût de régénération supérieur**, puisqu'on régénère des blocs et non des segments.

## Ce qui nous ferait revenir dessus

- **Le raccord entre blocs s'entend.** Si `audio-qa` mesure une discontinuité aux jonctions
  ou si l'écoute la révèle, et qu'aucun réglage de découpage ne la fait disparaître, la
  synthèse par bloc perd son avantage : retour à l'option B.
- **Le déterminisme est insuffisant pour itérer.** Si régénérer deux fois avec la même graine
  produit des rendus assez différents pour rendre la comparaison A/B impossible, le banc
  d'essai perd son sens et la boucle de retour redevient lente.
- **Le coût par histoire dépasse le double de l'estimation actuelle**, reprises comprises.
- **Le fournisseur retire `voiceSegments[]` ou en change le contrat.** C'est le pivot de la
  décision : sans lui, on retombe sur l'arbitrage A contre B.
- **Une contrainte réglementaire impose le traitement en Union européenne.** La résidence
  européenne est réservée aux comptes entreprise ; l'exigence rendrait le fournisseur
  inaccessible au palier visé.

À l'inverse, **un taux de déclenchement des tags de bruitage inférieur au seuil ne remet pas
cette décision en cause** : il ne touche que le contenu de E03, dont le repli — placer sur
`voiceSegments[]` — est précisément ce que cette décision rend possible.

## Impacts

- **E02** — porte la mise en œuvre : migration du SDK (T0200, préalable bloquant), nouveau
  format de script, synthèse multi-voix, découpage en blocs.
- **E03** — le placement des bruitages s'appuie sur `voiceSegments[]` ; le critère de sortie 4
  est à réécrire autour de ce repli.
- **E04** — le mixeur devient un assembleur de stems ; le moteur de timeline et sa table
  disparaissent (T0405).
- **E01** — le banc d'essai doit pouvoir mesurer la discontinuité aux jonctions de blocs,
  qui est le risque propre à cette décision.
- **S01** — son axe A valide ou réfute cet ADR. Son axe B n'en décide pas.

Aucun ADR antérieur n'est contredit : celui-ci est le premier.
