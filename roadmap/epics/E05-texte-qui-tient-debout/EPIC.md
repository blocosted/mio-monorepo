---
id: E05
titre: Texte qui tient debout
statut: a-faire
depend_de: [E04]
adr: []
objectif_mesurable: "Sur dix scripts générés, huit tiennent la structure narrative et le niveau de vocabulaire visés, jugés sur une grille écrite"
---

# E05 — Texte qui tient debout

## Après cet epic, je peux…

Lire un script généré et le trouver bien écrit : une histoire qui commence, monte et se
résout, des dialogues qui sonnent comme des enfants et des personnages, un vocabulaire qui
correspond à l'âge, et un rythme qui tient cinq minutes sans mollir.

Comparer dix générations sur une grille et voir laquelle de deux versions de prompt écrit
mieux, au lieu de juger sur une impression.

## Pourquoi maintenant

L'audio est réglé : ce qu'on entend maintenant, c'est le texte. Tant que le rendu était
mauvais, la qualité d'écriture était invisible sous les défauts techniques — c'est pour ça
que cet epic vient après E04 et pas avant.

Le repousser signifie continuer à générer des histoires correctement dites mais plates, ce
qui est un échec produit aussi certain qu'un mauvais mixage.

## Périmètre

**Dans :**
- La refonte des prompts d'enrichissement et de génération de script
- La structure narrative réellement tenue, pas seulement demandée
- La qualité des dialogues et du vocabulaire par tranche d'âge
- Un harnais d'évaluation de scripts, pour comparer deux versions de prompt
- La suppression de la contradiction entre le nombre de mots visé et le texte réellement
  prononcé

**Hors :**
- La sécurité du contenu — traitée par E06, qui est un chantier de nature différente
- Les univers réutilisables — E12
- Les réponses de l'enfant — E11

## Critères de sortie

1. Une grille d'évaluation écrite existe : structure, dialogue, vocabulaire, rythme,
   cohérence — avec pour chaque axe ce qui distingue un bon d'un mauvais script.
2. Un harnais génère N scripts sur un jeu de cas fixé et les note sur cette grille.
3. Sur dix scripts générés, au moins huit obtiennent la note visée sur chaque axe.
4. La cible de mots annoncée au modèle et le décompte de validation portent sur la même
   grandeur. Aujourd'hui le prompt réclame jusqu'à 1,8 fois la cible tout en demandant des
   didascalies, tandis que la validation compare au simple, en ne comptant que le texte
   prononcé — l'écart est structurel et rend le critère de longueur ininterprétable.
5. Sur trois tranches d'âge, le vocabulaire produit est distinguable — vérifié sur des
   indicateurs simples : longueur de phrase, fréquence des mots.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0501 | Grille d'évaluation | Écrire ce qui fait un bon script pour ce produit, de façon assez précise pour être appliquée par un tiers. | S |
| T0502 | Harnais d'évaluation | Générer N scripts sur des cas fixés et les noter, pour comparer deux versions de prompt. | M |
| T0503 | Refonte du prompt d'enrichissement | Reprendre l'enrichissement : univers, personnages, ton, en cohérence avec le nouveau format. | M |
| T0504 | Refonte du prompt de script | Reprendre la génération : structure en actes, dialogues, rythme, vocabulaire par âge. | L |
| T0505 | Cohérence du décompte | Aligner la cible annoncée au modèle et le décompte de validation sur la même grandeur. Aligner aussi la liste d'émotions du prompt sur le type partagé : deux valeurs supportées par le code sont absentes du prompt. | S |

## Dépendances et risques

Dépend de **E04** : juger l'écriture à travers un mauvais rendu conduit à corriger le mauvais
problème.

**Risque principal :** la qualité d'écriture est subjective et le harnais peut mesurer autre
chose que ce qui plaît. La grille doit être écrite avant le harnais, et validée sur des
scripts existants dont on sait déjà s'ils sont bons.

**Risque secondaire :** cet epic peut s'étendre indéfiniment — on peut toujours mieux écrire.
Les critères de sortie sont là pour l'arrêter. Si la note visée est atteinte, on livre.

## Questions ouvertes

- Qui note ? Une notation par modèle est reproductible mais peut être complaisante ; une
  notation humaine est juste mais lente. Probablement les deux : modèle pour le volume,
  humain sur un échantillon. **À trancher en T0502.**
- Quel jeu de cas fixé ? Il faut des situations couvrant les tranches d'âge et les tons.
