---
id: E01
titre: Banc d'essai audio
statut: a-faire
depend_de: []
adr: [ADR-0001]
objectif_mesurable: "Je génère une scène, je la mesure et je la compare à une autre version en moins d'une heure, sans lancer le workflow complet"
---

# E01 — Banc d'essai audio

## Après cet epic, je peux…

Prendre une scène, la régénérer avec un réglage modifié, obtenir ses mesures et l'écouter
comparée à la version précédente — en moins d'une heure, sans passer par les neuf étapes du
workflow ni par QStash.

Savoir si un rendu tient la comparaison avec une production commerciale, parce que j'ai
mesuré de vraies histoires du commerce et que la charte est calée dessus.

## Pourquoi maintenant

C'est le premier epic parce qu'il rend tous les suivants moins chers. Aujourd'hui, juger une
modification audio suppose de relancer une génération complète, d'attendre, d'écouter au
jugé, et de ne pas pouvoir comparer. Chaque amélioration coûte une session entière, et rien
n'empêche une régression de passer inaperçue.

C'est aussi ce qui transforme la charte sonore d'hypothèse en référentiel : tant qu'elle
n'est pas étalonnée sur des œuvres réelles, `audio-qa` peut déclarer « conforme » un rendu
qui ne soutient pas la comparaison.

Le repousser coûte cher de façon invisible : on ne saura pas ce qu'on aura perdu en jugeant
mal.

## Périmètre

**Dans :**
- Fiabiliser `analyse-audio.ts` sur de vraies sorties `ffmpeg` (le script compile mais n'a
  jamais tourné de bout en bout), et corriger deux défauts déjà identifiés statiquement :
  le critère d'écrêtage teste `Peak count === 0`, or cette mesure vaut au moins 1 sur tout
  fichier non silencieux — le verdict sera systématiquement en échec ; et le script **recopie
  les seuils de la charte** au lieu de s'y référer, ce qui contredit la règle de source unique
- Étalonner la charte sur des références commerciales
- **Fiabiliser et resserrer le chemin de génération hors workflow qui existe déjà**
  (`nx run scripts:pipeline -- full-story --scriptFile …`,
  `packages/scripts/src/pipeline/full-story.ts`) pour le ramener à l'échelle d'une scène
- **Compléter le magasin de runs existant** (`packages/scripts/src/_local-run-store/`) pour
  qu'il conserve le script et les mesures à côté du mix — les stems y sont déjà écrits par
  étape
- La comparaison outillée de deux rendus
- Le suivi du coût et de la durée par génération

**Hors :**
- Toute interface graphique — traité par E07, et le CLI suffit pour raccourcir la boucle
- Toute amélioration du rendu lui-même — c'est l'objet de E02 à E05 ; cet epic ne change pas
  une note de ce qui sort, il permet de le juger

## Critères de sortie

1. `analyse-audio.ts` produit des mesures correctes sur au moins trois fichiers réels de
   formats différents, vérifiées à la main contre la sortie brute de `ffmpeg`.
2. `roadmap/audio/references/` contient les mesures d'au moins deux histoires audio
   commerciales, et `charte.json` a été révisée en conséquence — chaque seuil modifié est
   justifié dans `PRODUIT.md` §7.
3. Une commande unique régénère une scène donnée à partir d'un script figé et produit : le
   mix, chaque stem séparé, le script utilisé, les mesures et la fiche d'écoute.
4. Une commande compare deux rendus et affiche l'écart mesure par mesure.
5. Le temps écoulé entre « je modifie un réglage » et « j'ai les deux fichiers et leur écart
   sous les yeux » est inférieur à 15 minutes, chronométré sur un cas réel.
6. Chaque génération enregistre son coût en appels d'API et sa durée.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0101 | Fiabiliser la mesure | Confronter le parsing `ebur128` / `astats` / `silencedetect` à de vraies sorties et corriger. Remplacer le critère d'écrêtage, inopérant. Supprimer la copie des seuils de la charte. Ajouter les cas dégradés : fichier muet, mono, très court. | M |
| T0102 | Étalonner la charte | Mesurer des références commerciales, comparer aux seuils actuels, réviser et justifier les écarts. | S |
| T0103 | Resserrer la génération hors workflow | Le chemin existe (`packages/scripts/src/pipeline/full-story.ts`) mais instancie les services par `new`, hors conteneur — il diverge donc du chemin de production. Le faire passer par le conteneur et le ramener à l'échelle d'une scène. | M |
| T0104 | Compléter le magasin de runs | Les stems sont déjà écrits par étape ; ajouter le script utilisé et les mesures sous le même identifiant de rendu. | S |
| T0105 | Comparer deux rendus | Écart mesure par mesure entre deux rendus, et fiche de comparaison. | S |
| T0106 | Compter le coût | Enregistrer appels d'API, caractères consommés et durée pour chaque génération. | S |

## Dépendances et risques

Rien ne doit exister avant, sauf `ffmpeg` installé localement.

**Risque principal :** l'étalonnage sur références commerciales peut invalider une partie de
la charte — c'est le but, mais il faut accepter de réécrire les seuils plutôt que de les
défendre. Signal d'alerte : si l'écart est important sur plus de trois critères, c'est le
raisonnement de `PRODUIT.md` §7 qu'il faut revoir, pas seulement les chiffres.

**Risque secondaire — déjà réalisé.** La génération hors workflow existante instancie les
services directement (`packages/scripts/src/pipeline/full-story.ts`), hors conteneur : elle
mesure donc potentiellement autre chose que ce qui sort en production. C'est l'objet de T0103,
et c'est à corriger avant d'étalonner quoi que ce soit.

## Questions ouvertes

- Quelles références commerciales ? Il en faut deux ou trois, possédées légalement, dont au
  moins une du segment visé (histoire du soir, 4-8 ans). **Décision en attente.**
- Faut-il un rendu de référence interne figé — une scène « étalon » régénérée à chaque
  changement — pour détecter les régressions ? Je penche pour oui, à trancher en T0103.
