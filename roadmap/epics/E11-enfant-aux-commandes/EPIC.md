---
id: E11
titre: L'enfant aux commandes
statut: a-faire
depend_de: [E10]
adr: []
objectif_mesurable: "Un enfant de 6 ans fabrique son histoire seul, sans savoir lire, et l'écoute"
---

# E11 — L'enfant aux commandes

*Découpage volontairement grossier.*

## Après cet epic, je peux…

Regarder un enfant de six ans fabriquer son histoire lui-même, sans savoir lire, et l'écouter
ensuite.

## Pourquoi maintenant

C'est le pari produit d'origine — l'histoire naît des réponses de l'enfant, pas d'un
formulaire rempli par un parent. Il n'a **jamais été implémenté** : le type qui représente
une question est déclaré et référencé zéro fois, et l'API accepte des réponses puis les jette.

Il vient après E10 parce qu'il suppose une application qui existe, et après E06 parce qu'un
enfant qui parle directement au système est exactement la situation que les garde-fous
doivent couvrir.

## Périmètre

**Dans :** génération de questions adaptées à l'histoire en cours · réponses par choix
illustrés, sans lecture requise · prise en compte réelle des réponses dans la génération ·
interface utilisable par un enfant qui ne lit pas.

**Hors :** l'entrée vocale et le clonage de voix — écartés tant que le régime juridique des
données biométriques de mineurs n'est pas traité (`PRODUIT.md` §5). Le code n'en contient
aucune trace aujourd'hui : c'est une décision à prendre, pas une dette.

## Critères de sortie

1. Les questions posées dépendent de l'histoire en cours, pas d'une liste figée.
2. Un enfant qui ne lit pas peut répondre à toutes les questions.
3. Les réponses influencent l'histoire de façon perceptible : deux jeux de réponses opposés
   sur le même point de départ produisent deux histoires distinctes.
4. Un enfant de six ans va au bout du parcours sans aide d'un adulte, observé au moins deux
   fois.

## Tâches pressenties

Non détaillées. Blocs identifiés : génération des questions · représentation des choix sans
texte · persistance des réponses (le champ existe déjà, rien ne l'écrit) · prise en compte
dans les prompts · interface enfant · chemin de sortie vers le parent en cas de détresse
(commencé en E06).

## Dépendances et risques

Dépend de **E10**, et fortement de **E06**.

**Risque principal :** une interface pour enfant qui ne lit pas n'est pas une interface
adulte en plus gros. C'est un métier, et le tester suppose des enfants disponibles.

**Risque secondaire :** l'enfant comme source d'entrée change la nature du produit du point
de vue réglementaire. À vérifier avant, pas après.

## Questions ouvertes

- Combien de questions avant que l'enfant se lasse ? Probablement trois à cinq. À observer,
  pas à décider.
- Les questions sont-elles posées à l'écrit illustré, ou lues à voix haute par le narrateur ?
  La seconde est plus cohérente avec un produit audio et plus coûteuse.
