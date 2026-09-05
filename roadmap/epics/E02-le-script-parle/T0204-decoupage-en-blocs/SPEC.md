---
id: T0204
epic: E02
titre: Découper le script en blocs de synthèse
statut: specifiee
type: feature
depend_de: [T0203]
adr: [ADR-0001]
research: [2026-09-05-elevenlabs-refonte-audio]
hypotheses: [S01-axe-A]
effort: M
---

# T0204 — Découper le script en blocs de synthèse

## Problème

La synthèse en une passe est bornée : au-delà d'environ deux mille caractères tous tours
confondus, la génération peut être tronquée ou refusée. Une histoire de cinq minutes
représente de l'ordre de trois mille cinq cents caractères prononcés : elle ne tient pas en
une requête.

Et **aucun mécanisme du fournisseur n'assure la continuité entre deux requêtes** : la couture
qui existait pour les modèles précédents n'est pas disponible sur celui-ci. Le raccord est
donc entièrement à notre charge.

C'est le risque propre à ADR-0001, nommé dans ses conséquences acceptées et sans équivalent
dans les options écartées : on gagne la prosodie à l'intérieur d'un bloc, on la perd
potentiellement à la jonction.

## Objectif

Une histoire de n'importe quelle longueur est synthétisée par blocs dont les jonctions ne
s'entendent pas.

## Périmètre

**Dans :**
- La découpe d'une suite de tours en blocs respectant la limite du fournisseur
- Le choix des points de découpe
- Le raccord des stems de blocs successifs
- La continuité des bornes de tours à travers les blocs
- La mesure de la qualité du raccord
- Le cache par bloc

**Hors :**
- La synthèse elle-même — T0203
- La notion de scène dans le format de script, question ouverte de T0201
- L'assemblage avec les autres stems — E04

## Comportement attendu

### Cas nominal

Une suite de tours trop longue est découpée en blocs. Chaque bloc est synthétisé
indépendamment, et les stems obtenus sont raccordés en un stem unique.

Les bornes de tours sont exprimées **dans le référentiel du stem final**, pas dans celui de
leur bloc d'origine. Un consommateur en aval n'a pas à savoir qu'il y a eu découpage.

Les points de découpe sont choisis là où une rupture de continuité est la moins perceptible :
un changement de lieu, une fin de scène, une transition narrative. Un découpage au milieu d'un
échange rapide entre deux personnages est le pire cas.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Le script tient en un bloc | Aucun découpage, aucun raccord : le cas simple reste simple |
| Un tour unique dépasse à lui seul la limite | Échec explicite nommant le tour et sa taille — on ne coupe pas au milieu d'une réplique |
| Deux blocs consécutifs partagent un locuteur | La voix reste la même de part et d'autre de la jonction |
| Un bloc ne contient qu'un tour | Fonctionne |
| Le nombre de locuteurs d'un bloc dépasse la limite du fournisseur | Le découpage doit en tenir compte : c'est une contrainte du découpage, pas une erreur de synthèse |
| Un bloc est déjà en cache et l'autre non | Seul le bloc absent est généré |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Aucun point de découpe acceptable ne permet de respecter la limite | Échec explicite plutôt qu'un découpage arbitraire | **échec** | sortie d'erreur |
| Un bloc échoue à la synthèse | Échec de l'ensemble | **échec** | journal, en nommant le bloc |
| Le raccord produit une discontinuité mesurable au-delà du seuil | Échec, ou signalement bloquant | **échec** | mesure jointe |

Aucun repli : un stem raccordé dont on ignore la qualité du raccord ramènerait l'incertitude
que cette tâche existe pour supprimer.

## Contrats

### Résultat de synthèse découpée

Identique en forme au résultat de T0203 — un stem, et pour chaque tour ses bornes — de sorte
qu'un consommateur ne distingue pas une histoire découpée d'une histoire d'un seul bloc.

Le résultat porte en outre, à titre de diagnostic : le nombre de blocs, la position de chaque
jonction dans le stem final, et la mesure de discontinuité à chaque jonction.

### Invariant

Les bornes de tours sont strictement croissantes sur l'ensemble du stem final, y compris à
travers les jonctions.

## Critères d'acceptation

1. Un script dépassant la limite produit un stem unique dont les bornes de tours sont
   croissantes de bout en bout.
2. Un script tenant en un bloc ne subit ni découpage ni raccord, et le résultat est identique
   à celui de T0203 seul.
3. Aucun bloc ne dépasse la limite de caractères ni la limite de locuteurs distincts du
   fournisseur.
4. Aucun point de découpe ne tombe à l'intérieur d'un tour.
5. À chaque jonction, la discontinuité mesurée reste sous un seuil déclaré dans
   `charte.json` — critère ajouté à la charte par cette tâche.
6. Sur une histoire de cinq minutes, les blancs internes du stem final respectent les seuils
   de la charte, jonctions comprises : une jonction ne crée pas un blanc aberrant.
7. Une seconde génération du même script ne régénère que les blocs dont le contenu a changé.
8. Un tour dépassant à lui seul la limite fait échouer la génération en nommant ce tour.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 2, 3, 4, 8 | Tests unitaires sur le découpage, avec des scripts d'épreuve de tailles variées |
| 5 | Mesure sur le stem produit, aux positions de jonction rendues par le résultat |
| 6 | Mesure `audio-qa` sur une histoire complète |
| 7 | Test d'intégration : deux générations successives avec un tour modifié dans un seul bloc |

Les critères 5 et 6 exigent un accès réel au fournisseur.

## Impacts

- **Rend E02 utilisable sur une histoire réelle** : sans cette tâche, T0203 ne traite que des
  scènes.
- **Ajoute un critère à `charte.json`** : le seuil de discontinuité aux jonctions. C'est un
  seuil dont T0102 n'aura pas d'étalon commercial — une œuvre du commerce n'a pas de jonctions
  de blocs. Il devra être établi à l'écoute.
- **Coût** : le cache par bloc réduit fortement le coût des reprises, mais une modification en
  début d'histoire invalide tous les blocs suivants si le découpage dépend du contenu amont.

## Risques et questions ouvertes

**C'est le risque principal d'ADR-0001, et cette tâche est l'endroit où il se matérialise.**
Si les jonctions s'entendent malgré tous les réglages de découpage, le déclencheur de révision
d'ADR-0001 est atteint et l'option B redevient d'actualité. C'est une issue légitime de cette
tâche, pas un échec à contourner.

**Chevauchement ou jonction franche ?** Répéter le dernier tour d'un bloc en tête du suivant
pour lisser la transition, ou couper net à un silence de scène ? La première option coûte des
caractères et pose la question du raccord des deux versions du même tour ; la seconde est
simple mais expose la rupture. **Question ouverte, à trancher à l'oreille** — c'est
précisément le genre de choix qu'une spec ne doit pas faire à la place de la mesure.

**Le seuil de discontinuité n'a pas d'étalon.** Contrairement aux autres critères de la
charte, celui-ci ne peut pas être calé sur une œuvre commerciale. **Question ouverte.**

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
