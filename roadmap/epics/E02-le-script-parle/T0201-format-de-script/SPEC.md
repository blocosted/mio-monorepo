---
id: T0201
epic: E02
titre: Nouveau format de script — tours de parole et fin du timing relatif
statut: specifiee
type: refonte
depend_de: [T0200]
adr: [ADR-0001]
research: [2026-09-05-elevenlabs-refonte-audio]
hypotheses: [S01-axe-A]
effort: M
---

# T0201 — Nouveau format de script — tours de parole et fin du timing relatif

## Problème

Le format actuel (`packages/shared/src/types/script.types.ts:319`) organise le script en
**pistes** contenant des **segments**, où les segments non vocaux se positionnent par un
`timingHint` référençant un segment vocal par identifiant (`:233`, `:250`).

Ce format encode le modèle temporel qu'ADR-0001 abandonne. Il pose trois problèmes qui ne se
règlent pas par correction :

**Il demande au modèle de langage ce qu'il fait le plus mal.** Le `timingHint` exige
d'inventer des références croisées entre deux tableaux produits dans la même passe, au sein
d'un document JSON de plusieurs milliers de jetons. Une référence invalide n'est détectée
nulle part : `timeline-computation.service.ts:411-418` journalise un avertissement et
**renvoie 0**, ce qui empile les sons au début de l'histoire.

**Il sépare ce que la synthèse veut ensemble.** Les répliques sont réparties dans une piste
« voix » comme des éléments indépendants, alors que la synthèse en une passe a besoin d'une
**suite ordonnée de tours** avec leur locuteur.

**Il porte des champs devenus faux.** `estimatedDuration` est une durée prédite par le modèle,
consommée pour dimensionner la génération audio
(`audio-generation.orchestrator.ts:176,236,288`). ADR-0001 pose que l'audio fait foi.

## Objectif

Le script décrit une suite de tours de parole et des intentions sonores, sans jamais prétendre
connaître le temps.

## Périmètre

**Dans :**
- La structure du script produit par le modèle et consommé par le pipeline
- La disparition du positionnement temporel relatif
- La disparition des durées prédites comme entrée de génération
- La forme des tours : locuteur, texte, intention de jeu
- La déclaration explicite d'une piste d'ambiance, aujourd'hui jamais demandée
- La migration ou l'abandon des scripts existants

**Hors :**
- La validation d'exécution de ce format, qui est T0202
- Le contenu des prompts qui produisent ce script — la qualité d'écriture est E05, la
  sécurité E06
- La façon dont le format est consommé par la synthèse, qui est T0203

## Comportement attendu

### Cas nominal

Le script porte une suite ordonnée de tours. Chaque tour désigne son locuteur — narrateur ou
personnage nommé — son texte, et l'intention de jeu attendue. L'ordre des tours est l'ordre
d'écoute ; aucune autre information temporelle n'est nécessaire pour les synthétiser.

Les intentions sonores — bruitage, musique, ambiance — se rattachent à un **tour**, pas à un
temps. Un bruitage dit « pendant ce tour », jamais « à 12,4 secondes ». La conversion en
temps absolu se fera après génération, sur les bornes mesurées.

Un script ne contient aucune durée qui serve à dimensionner une génération.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Un tour sans locuteur explicite | Le narrateur est un locuteur comme un autre : il est nommé, jamais implicite |
| Deux personnages portant le même nom | Refusé : le nom est l'identifiant du locuteur dans le script |
| Une intention sonore rattachée à un tour inexistant | Détectable structurellement, et rejetée par T0202 |
| Un script sans aucune intention sonore | Valide : une histoire nue est un cas légitime |
| Un tour au texte vide | Refusé |
| Un script sans ambiance | Valide : l'ambiance est optionnelle, mais sa piste doit pouvoir être demandée |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Un script au format précédent est rencontré | Rejet explicite nommant la version attendue | **échec** | sortie d'erreur |
| Une intention sonore sans tour de rattachement | Rejet | **échec** | via T0202 |

Le repli silencieux à zéro qui existe aujourd'hui disparaît avec le champ qui le rendait
possible. C'est le bénéfice principal de cette tâche.

## Contrats

Le format de script est un contrat, et il a sa place ici en toutes lettres.

**Identité.** Le script porte une version de format explicite, distincte de la précédente, de
sorte qu'un script ancien soit reconnaissable et refusé plutôt que mal interprété.

**Tours.** Une suite ordonnée. Chaque tour porte : un identifiant stable, le nom du locuteur,
le texte à dire, et l'intention de jeu. L'ordre de la suite est l'ordre d'écoute.

**Locuteurs.** Une table associant à chaque nom de locuteur une description de voix, et
éventuellement une voix déjà attribuée. Le narrateur y figure au même titre que les
personnages.

**Intentions sonores.** Rattachées à un identifiant de tour, avec la nature de l'intention
(bruitage, musique, ambiance) et sa description. Aucune durée, aucun temps absolu, aucun
décalage en millisecondes.

**Métadonnées.** Ce que le modèle a produit à titre indicatif — titre, langue, niveau de
vocabulaire, décompte de mots — clairement séparé de ce qui est contractuel. Toute grandeur
de durée y est explicitement une intention, jamais une entrée de génération.

## Critères d'acceptation

1. Le format ne contient aucun champ exprimant un temps absolu, un décalage, ou une durée
   destinée à dimensionner une génération audio.
2. Un script au format précédent est rejeté avec un message nommant la version attendue.
3. Toute intention sonore se rattache à un tour par son identifiant, jamais à un temps.
4. Le narrateur est un locuteur nommé dans la table des locuteurs, au même titre qu'un
   personnage.
5. Un script exprimant une ambiance est représentable ; le format ne l'interdit pas et permet
   qu'elle soit demandée au modèle.
6. Le sort des scripts déjà produits est tranché et appliqué : migrés, ou abandonnés
   explicitement.
7. Aucun code du pipeline ne lit plus un champ de durée prédite pour dimensionner une
   génération.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1 | Lecture du contrat de format |
| 2 | Test sur un script de l'ancien format |
| 3, 4, 5 | Tests sur des scripts d'épreuve représentant chaque cas |
| 6 | Inspection des scripts conservés et de la décision écrite |
| 7 | Recherche dans le code des lectures de durée prédite |

## Impacts

- **Rupture de contrat assumée.** Tous les scripts existants deviennent invalides. Le
  critère 6 impose de trancher leur sort plutôt que de le subir.
- **Touche** la génération de script, sa validation, la synthèse, la génération sonore et le
  mixage. C'est la tâche la plus transversale de l'epic, et c'est pourquoi elle vient tôt.
- **Code supprimé** : le positionnement temporel relatif et les types qui le portent.
- **Rend caduque** une partie du prompt de génération de script, réécrite en E05.

## Risques et questions ouvertes

**La notion de scène n'existe pas dans ce format et T0103 en a besoin.** Découper une histoire
en scènes sert au banc d'essai comme au découpage en blocs de T0204. Faut-il l'introduire ici,
ou la laisser dérivée de l'ambiance et des changements de lieu ? **Question ouverte** : la
trancher pendant l'implémentation reviendrait à décider d'un contrat en silence.

**Le sort des scripts existants est une décision produit.** Les migrer suppose d'inventer les
tours à partir des segments ; les abandonner supprime la possibilité de comparer avant / après
sur du contenu réel, ce dont le banc d'essai a besoin. **Décision en attente.**

**Cette spec repose sur une hypothèse non levée.** Le format est taillé pour une synthèse en
une passe. Si l'axe A de S01 est rejeté, ADR-0001 devient obsolète et ce format n'a plus lieu
d'être sous cette forme. À relire dès le verdict.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
