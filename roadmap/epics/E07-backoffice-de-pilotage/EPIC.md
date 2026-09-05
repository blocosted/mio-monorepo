---
id: E07
titre: Backoffice de pilotage
statut: a-faire
depend_de: [E04]
adr: []
objectif_mesurable: "Je conduis un cycle complet — générer, écouter stem par stem, comparer, annoter — sans quitter le backoffice ni ouvrir un terminal"
---

# E07 — Backoffice de pilotage

## Après cet epic, je peux…

Écouter chaque stem isolément, en solo ou coupé, avec les mesures affichées à côté du lecteur.

Comparer deux générations de la même scène côte à côte, et annoter ce que j'entends à
l'horodatage près, sans recopier à la main dans un fichier.

Voir ce qu'a coûté chaque histoire.

## Pourquoi maintenant

E01 a donné la boucle rapide en ligne de commande, ce qui suffisait à débloquer E02 à E04.
Cet epic la rend confortable, et surtout il ajoute ce que le terminal fait mal : l'écoute
comparée et l'annotation.

Il vient après E04 parce que construire l'interface avant que la forme des stems soit
stabilisée garantit de la refaire.

## Périmètre

**Dans :** lecteur multi-stems avec solo et coupure · mesures affichées à côté du lecteur ·
comparaison de deux générations · annotation horodatée alimentant la fiche d'écoute ·
visualisation du script et de ses erreurs de validation · coût et durée par histoire.

**Hors :** toute interface destinée à un parent ou à un enfant — E10 et E11. Ce backoffice
est un outil de pilotage, pas un brouillon de produit ; le confondre avec l'application
parent conduirait à livrer un outil d'administration à des familles.

## Critères de sortie

1. Je peux écouter n'importe quel stem d'une histoire, seul ou mêlé aux autres.
2. Les mesures `audio-qa` sont visibles sans quitter la page d'écoute, avec l'écart à la
   charte mis en évidence.
3. Je peux lancer deux générations d'une même scène et les écouter en alternance.
4. Une annotation horodatée saisie pendant l'écoute se retrouve dans la fiche d'écoute.
5. Le coût et la durée de chaque génération sont affichés dans la liste des histoires.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0701 | Lecteur multi-stems | Solo, coupure, position partagée entre stems. | M |
| T0702 | Mesures dans l'interface | Afficher les mesures et l'écart à la charte à côté du lecteur. | M |
| T0703 | Comparaison A/B | Deux générations, écoute en alternance à position conservée. | M |
| T0704 | Annotation d'écoute | Saisie horodatée pendant l'écoute, versée dans la fiche. | M |
| T0705 | Script et validation | Afficher le script généré et les erreurs de validation associées. | S |
| T0706 | Coût et durée | Exposer les compteurs de E01 dans la liste des histoires. | S |

## Dépendances et risques

Dépend de **E04**, et de T0104 et T0106 pour les données affichées.

**Risque :** l'epic peut s'étendre indéfiniment, un backoffice n'étant jamais fini. Les
critères de sortie l'arrêtent. Toute idée supplémentaire devient une tâche à part, arbitrée
plus tard.

## Questions ouvertes

- Faut-il une visualisation graphique de la timeline des stems, ou le lecteur suffit-il ?
  Coûteux, séduisant, et peut-être inutile maintenant que le placement est délégué.
