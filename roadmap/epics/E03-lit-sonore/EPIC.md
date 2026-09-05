---
id: E03
titre: Lit sonore
statut: a-faire
depend_de: [E02]
adr: [ADR-0001]
objectif_mesurable: "Une seule ambiance à la fois, une musique continue sans couture audible, des bruitages à leur place"
---

# E03 — Lit sonore

## Après cet epic, je peux…

Écouter une histoire portée par une musique qui est un vrai morceau, à la longueur du récit,
sans motif qui redémarre toutes les vingt secondes.

Entendre une seule ambiance à la fois, qui entre et sort en fondu au changement de lieu.

Entendre les bruitages tomber sur le mot qu'ils accompagnent, y compris à la fin de
l'histoire.

## Pourquoi maintenant

C'est le deuxième symptôme le plus audible après la voix, et il dépend d'elle : les stems
d'accompagnement se calent sur la durée réelle de la piste voix, qui n'est connue qu'une fois
E02 livré.

Le repousser laisse en place deux défauts structurels. Une musique fabriquée en bouclant un
clip court issu de l'API d'effets sonores, d'abord. Et une ambiance qui n'existe pas : la
piste n'étant jamais demandée au LLM, l'étape de génération d'ambiance du workflow **ne
produit jamais rien** — elle consomme un aller-retour de file de messages, un créneau de
progression et deux reprises configurées pour rien. Le mécanisme d'empilement de N ambiances
jusqu'à la fin existe bien dans le mixeur, mais il ne s'est jamais déclenché en production.

## Périmètre

**Dans :**
- La musique comme morceau unique à la longueur de l'histoire
- L'ambiance comme stem exclusif : une seule à la fois, transitions en fondu croisé
- Les bruitages ponctuels portés par le script lui-même plutôt que placés après coup
- La suppression du placement de bruitages et des bibliothèques devenues sans usage

**Hors :**
- L'équilibre des niveaux entre stems — traité par E04. Ici on produit de bons stems, on ne
  les mélange pas
- La bibliothèque persistante d'ambiances, qui reste et garde son approche par
  bibliothèque d'abord

## Critères de sortie

1. Sur une histoire de cinq minutes, le stem musique est un fichier unique de la durée du
   stem voix, sans discontinuité d'amplitude détectable.
2. À tout instant de l'histoire, au plus une ambiance est audible. Vérifié sur un script
   comportant au moins trois changements de lieu.
3. Chaque transition d'ambiance comporte un fondu, mesurable et audible ; aucune ne se
   termine par une coupure sèche.
4. Sur les trois derniers bruitages d'une histoire de cinq minutes, l'écart entre le moment
   attendu et le moment entendu est inférieur à 300 ms.
5. Le code de placement de bruitages et les bibliothèques sans usage sont supprimés, ou
   branchés.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0301 | Stem musique | Générer la musique comme morceau unique à la longueur mesurée du stem voix. | M |
| T0302 | Stem ambiance exclusif | Une ambiance à la fois, séquencée avec fondus croisés aux changements de lieu, sur toute la durée. | M |
| T0303 | Bruitages portés par le script | Faire porter les bruitages ponctuels par le script de dialogue plutôt que par une piste séparée à placer. | M |
| T0304 | Nettoyage sound-design | Supprimer le placement de bruitages, les bibliothèques musique et effets devenues sans usage, et les constantes orphelines. Supprimer aussi l'étape de workflow qui ne produit rien. | S |

## Dépendances et risques

Dépend de **E02** : la durée réelle de la voix est l'entrée de tout le reste.

**Risque principal — désormais quasi certain.** La veille a établi que l'éditeur documente
les tags de bruitage tout en les **déconseillant explicitement dans son propre outil de
production**, et qu'ils sont dépendants de la voix et à tester avant tout usage réel. Le
critère 4 est donc probablement inatteignable tel qu'écrit. Le repli est identifié et propre :
une piste de bruitages placée par Mio sur les bornes de `voiceSegments[]` — l'API renvoie,
pour chaque tour du script, la voix et ses bornes en secondes issues de l'audio réellement
produit. Placer redevient sûr, puisqu'on place sur du mesuré. S01 mesure le taux de
déclenchement pour savoir s'il reste un usage marginal aux tags.

**Risque secondaire :** la génération musicale est réservée aux comptes payants et son coût
n'est pas connu. À chiffrer avant T0301.

## Questions ouvertes

- Une musique unique sur toute l'histoire, ou un enchaînement de deux ou trois mouvements
  suivant les actes ? Le second est plus riche mais rouvre un problème de transition. Je
  penche pour commencer par un morceau unique et n'ajouter les mouvements que si l'écoute
  le réclame.
- Faut-il conserver une bibliothèque de musiques réutilisables entre histoires, comme pour
  l'ambiance ? Compromis entre coût et variété. **Décision produit en attente** au vu des
  tarifs relevés.
