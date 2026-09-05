---
id: E02
titre: Le script parle
statut: a-faire
depend_de: [E01]
adr: [ADR-0001]
objectif_mesurable: "Les blancs entre répliques tiennent la charte, narrateur et personnages ont des voix distinctes et stables sur toute l'histoire"
---

# E02 — Le script parle

## Après cet epic, je peux…

Écouter une histoire dont les répliques s'enchaînent naturellement, sans blanc trop long ni
bafouillage, et où le narrateur et chaque personnage gardent une voix propre et reconnaissable
d'un bout à l'autre.

Constater que le ton d'une réplique correspond à ce que dit le texte.

## Pourquoi maintenant

C'est le défaut le plus audible et le plus structurant. Trois des quatre symptômes constatés
— blancs mal gérés, tons plats, voix indistinctes — ont la même origine : chaque segment est
synthétisé isolément, puis recollé.

C'est aussi le contrat central du système. Le format du script et la façon de le synthétiser
sont une seule et même décision : on ne peut pas changer l'un sans l'autre. Le repousser
condamne E03 et E04 à s'appuyer sur une piste voix dont la durée réelle ne correspond à
aucune prédiction.

## Périmètre

**Dans :**
- **La migration du SDK du fournisseur.** Le paquet épinglé est déprécié et n'expose ni la
  synthèse de dialogue ni la génération musicale : c'est un préalable bloquant à E02, E03 et
  E04, pas une tâche de confort
- Le nouveau format de script : des tours de parole, des tags audio en ligne, plus de
  `timingHint`
- La validation d'exécution du script produit par le LLM
- Le passage à une synthèse multi-voix en une passe
- Le découpage en blocs aux frontières de scène, pour rester sous la limite de caractères
- L'attribution des voix : narrateur explicite, unicité par personnage, détection fiable en
  français
- La suppression du code de narration devenu inutile

**Hors :**
- La qualité d'écriture du texte — traité par E05. Ici on change *comment le texte est dit*,
  pas *ce qui est dit*
- La musique, l'ambiance, les bruitages d'atmosphère — traités par E03
- L'assemblage final — traité par E04

## Critères de sortie

1. Sur une histoire de cinq minutes, les blancs internes respectent les seuils de médiane,
   p90 et maximum de `charte.json`, mesurés par `audio-qa`.
2. Aucun personnage ne partage sa voix avec un autre, et le narrateur a une voix qui n'est
   celle d'aucun personnage — vérifié sur une histoire à quatre personnages minimum.
3. Un même personnage garde exactement la même voix sur toute l'histoire.
4. Aucune didascalie n'est prononcée : sur un script contenant des attributions de dialogue
   en français avec guillemets typographiques, seul le texte entre guillemets est vocalisé.
5. Un script dont une référence croisée ou une valeur d'énumération est invalide est
   **rejeté** avec une erreur nommée, jamais accepté avec une valeur de repli.
6. Les services de narration jamais appelés sont supprimés du dépôt, ou branchés.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0200 | Migrer le SDK du fournisseur | Passer du paquet déprécié au paquet courant et migrer les appels existants. Préalable bloquant : sans lui, ni dialogue ni musique n'existent. | M |
| T0201 | Format de script | Définir le nouveau contrat : tours de parole, tags en ligne, plus de timing relatif. C'est la tâche pivot de l'epic. | M |
| T0202 | Validation d'exécution | Valider le script du LLM à l'exécution — énumérations, références, bornes — avec rejet et retour d'erreur exploitable pour la reprise. | M |
| T0203 | Synthèse multi-voix | Remplacer la synthèse segment par segment par une génération en une passe. | L |
| T0204 | Découpage en blocs | Découper aux frontières de scène pour tenir la limite de caractères, avec cache par bloc. | M |
| T0205 | Attribution des voix | Narrateur explicite, unicité, normalisation des accents, correction des collisions de mots-clés. | M |
| T0206 | Nettoyage narration | Supprimer les services de narration injoignables et le calcul de pauses devenu sans objet. | S |

## Dépendances et risques

Dépend de **E01** : sans banc d'essai, on ne saura pas si le changement améliore.
Dépend du **spike S01**, dont le verdict détermine si cette architecture est retenue.
Dépend d'un **ADR** actant la délégation du timing.
T0200 conditionne tout le reste de l'epic, et aussi E03 et E04.

**Risque principal :** la granularité de reprise diminue. Aujourd'hui un segment raté se
régénère seul ; demain c'est un bloc entier, et le modèle n'étant pas déterministe, le reste
du bloc changera aussi. C'est le prix assumé de la continuité prosodique. Le découpage aux
frontières de scène le rend supportable ; à surveiller au premier usage réel.

**Risque secondaire :** dépendance à une API en statut *alpha*. Signal d'alerte : une rupture
de contrat non annoncée, ou une dégradation de qualité entre deux générations identiques.

## Questions ouvertes

- La limite de caractères par requête impose un découpage : faut-il un chevauchement entre
  blocs pour lisser la jonction, ou une jonction franche à un silence de scène ? À trancher
  en T0204, à l'oreille.
- Le coût par histoire change de façon non triviale. À mesurer dès S01 (T0106 fournit
  l'instrumentation).
