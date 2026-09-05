---
id: E04
titre: Mixage et masterisation
statut: a-faire
depend_de: [E03]
adr: [ADR-0001]
objectif_mesurable: "Le mix final tient tous les critères de charte.json sans intervention manuelle, sur dix histoires consécutives"
---

# E04 — Mixage et masterisation

## Après cet epic, je peux…

Écouter deux histoires à la suite sans toucher au volume.

Entendre chaque mot, sans qu'un bruitage ne le masque ni qu'une musique ne le couvre, et
sans craquement dans les passages forts.

Constater que le mix tient la charte tout seul, sans réglage à la main.

## Pourquoi maintenant

Le mixage est l'endroit où les stems se rencontrent : il ne peut se régler qu'une fois les
stems bons. C'est aussi l'epic qui supprime le moteur de timeline, dont la disparition est
la conséquence logique des trois précédents — tant qu'il existe, deux horloges continuent de
diverger.

Le repousser laisse en place quatre défauts additifs : un volume appliqué deux fois qui rend
la musique presque inaudible, une somme de pistes sans marge qui écrête dans les passages
denses, un ducking dont le relâchement trop court fait pomper la musique entre les mots, et
une cible de masterisation figée à −16 LUFS dans le code alors que la charte demande −19 à
−17. Tant que cette constante n'est pas alignée, **le critère de sortie 1 est structurellement
inatteignable** — et c'est une source de vérité concurrente de plus pour le niveau sonore.

## Périmètre

**Dans :**
- Réduire le mixeur à l'assemblage de stems de même durée
- Supprimer la double application du gain et réconcilier les tables de volumes contradictoires
- Régler le ducking pour qu'il ne pompe pas
- Garantir une marge avant écrêtage dans la somme des pistes
- La masterisation finale au niveau de la charte
- Supprimer le moteur de timeline et sa table

**Hors :**
- La production des stems — c'est E02 et E03
- Toute interface de réglage — E07

## Critères de sortie

1. Sur dix histoires générées consécutivement, tous les critères de `charte.json` sont
   respectés sans intervention manuelle.
2. L'écart de niveau intégré entre ces dix histoires est inférieur à 1 LU.
3. Aucun échantillon en crête sur ces dix histoires.
4. Les écarts de niveau entre stems respectent la section `_equilibreStems` de la charte.
5. À l'écoute, la musique ne remonte pas entre les mots — vérifié sur un passage à dialogue
   rapide, selon le protocole d'écoute.
6. Le moteur de timeline, sa table et les constantes de volume dupliquées n'existent plus.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0401 | Mixeur de stems | Réduire le mixeur à l'assemblage de stems de même durée : plus de placement, plus de concaténation, plus de silences générés. | M |
| T0402 | Gain unique | Décider où le gain s'applique — au rendu ou au mixage, pas les deux — et réconcilier les **quatre** sources de volume par défaut, pas seulement les deux tables nommées. | M |
| T0403 | Ducking et marge | Régler le ducking pour la parole et garantir une marge avant écrêtage dans la somme. | M |
| T0404 | Masterisation | Amener le mix au niveau de la charte de façon reproductible, en deux passes si nécessaire. La cible ne doit exister qu'à un seul endroit : aujourd'hui le code en fixe une qui contredit la charte. | S |
| T0405 | Suppression du moteur de timeline | Supprimer le service, la table et les types associés. | S |

## Dépendances et risques

Dépend de **E03**.

**Risque principal :** la suppression de la table de timelines est irréversible pour les
histoires existantes. À traiter comme une migration : décider si les histoires déjà générées
sont conservées, régénérées ou abandonnées. C'est une question à trancher dans la spec de
T0405, pas pendant l'implémentation.

**Risque secondaire :** viser un niveau trop bas peut rendre les histoires inaudibles sur un
petit haut-parleur. Le critère 1 se vérifie à la mesure, mais le protocole d'écoute en
conditions réelles reste obligatoire.

## Questions ouvertes

- **Garde-t-on `fluent-ffmpeg` ?** Le paquet est **déprécié** (« Package no longer supported »)
  et figé depuis mai 2024 : `2.1.3` est à la fois la version installée et la dernière. Il ne
  peut donc pas être mis à jour. C'est un enrobage qui construit des arguments de ligne de
  commande ; une fois le mixeur réduit à l'assemblage de trois stems, il n'apporte presque
  plus rien, et le dépôt appelle déjà `ffmpeg` directement ailleurs. Le supprimer au profit
  d'un appel direct retire une dépendance morte du chemin critique. **Décision technique en
  attente**, à trancher au moment de T0401.
- Que fait-on des histoires déjà générées ? Régénération, conservation en l'état, ou purge.
  **Décision produit en attente.**
- Faut-il une compression douce sur la voix avant le mixage pour resserrer la dynamique, ou
  la masterisation suffit-elle ? À évaluer à l'oreille en T0404.
