---
id: T0200
epic: E02
titre: Migrer vers le SDK courant du fournisseur audio
statut: specifiee
type: dette
depend_de: []
adr: [ADR-0001]
research: [2026-09-05-elevenlabs-refonte-audio]
hypotheses: []
effort: S
---

# T0200 — Migrer vers le SDK courant du fournisseur audio

## Problème

`package.json:56` épingle `elevenlabs@^1.59.0`. Ce paquet est **officiellement déprécié** —
« This package has moved to `@elevenlabs/elevenlabs-js` » — et figé au 15 mai 2025.

Le problème n'est pas l'obsolescence en soi, c'est ce qu'elle empêche : **l'ancien paquet
n'expose ni la synthèse de dialogue ni la génération musicale**. Comparaison des ressources des
deux paquets : `textToDialogue` et `music` sont absents de la version 1.59.0. Aucune ligne de
E02, E03 ou E04 n'est réalisable dessus.

Le paquet courant `@elevenlabs/elevenlabs-js@2.66.0` est déjà installé à côté de l'ancien ;
les appels ne sont pas migrés.

La surface concernée est petite : **quatre appels, sur deux fichiers**, tous présents sous le
même nom dans le paquet courant.

| Appel | Fichier |
|---|---|
| `textToSpeech.convertWithTimestamps` | `apps/api/src/repositories/audio/audio.repository.ts:149` |
| `voices.getAll` | `apps/api/src/repositories/audio/audio.repository.ts:248` |
| `textToSoundEffects.convert` | `apps/api/src/repositories/audio/audio.repository.ts:314` |
| `voices.getShared` | `apps/api/src/services/narration/voice-registry.service.ts:266` |

Le risque ne porte donc pas sur les noms de méthodes, mais sur la **forme des réponses**, qui
a pu changer entre une version majeure et la suivante.

## Objectif

Le dépôt n'utilise plus qu'un seul SDK du fournisseur, à jour, et le comportement audio
observable est inchangé.

## Périmètre

**Dans :**
- Le remplacement des quatre appels
- La vérification que la forme des réponses consommées est bien celle attendue
- La suppression de l'ancien paquet des dépendances
- Le maintien à l'identique du comportement observable

**Hors :**
- Tout usage des nouvelles capacités — dialogue, musique. C'est T0203 et E03. Cette tâche
  ouvre la porte, elle ne la franchit pas
- Toute refonte de l'abstraction de dépôt : on migre, on ne réorganise pas
- Le remplacement de `fluent-ffmpeg`, question ouverte de E04

## Comportement attendu

### Cas nominal

Une génération audio produit exactement ce qu'elle produisait avant la migration : mêmes
fichiers, mêmes durées rapportées, mêmes données d'alignement. La migration est invisible à
l'écoute et à la mesure.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Un champ de réponse a changé de nom entre les deux versions | Détecté à la compilation ou par un test, jamais silencieusement absent |
| Un champ a changé d'unité ou de forme | Détecté par comparaison de mesures avant / après sur le même contenu |
| Une méthode a un paramètre supplémentaire obligatoire | Compilation en échec, ce qui est le comportement souhaité |
| Une donnée d'alignement absente | Le comportement de repli existant est conservé tel quel, y compris son défaut : cette tâche ne corrige rien |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Clé d'API absente | Inchangé par rapport à aujourd'hui | échec | inchangé |
| Erreur du fournisseur | Inchangé | inchangé | inchangé |
| Forme de réponse inattendue | Échec explicite nommant le champ | **échec** | sortie d'erreur |

Aucun nouveau repli n'est introduit. Aucun repli existant n'est corrigé ici — les corriger
serait changer le comportement, ce que cette tâche s'interdit.

## Contrats

Aucun contrat externe ne change : ni schéma d'API, ni colonne, ni format de fichier. C'est ce
qui rend cette tâche vérifiable par comparaison.

Le dépôt ne déclare plus qu'un seul paquet du fournisseur.

## Critères d'acceptation

1. Aucune importation de l'ancien paquet ne subsiste dans le dépôt.
2. L'ancien paquet ne figure plus dans les dépendances déclarées.
3. Sur un script figé, la génération produit des durées rapportées identiques à celles
   d'avant la migration, à la tolérance de non-déterminisme du fournisseur près.
4. Les données d'alignement consommées ont la même forme et les mêmes unités qu'avant.
5. La liste des voix récupérées est identique en nombre et en champs consommés.
6. La compilation et la vérification de types passent sans assertion de type ajoutée pour
   contourner un écart de forme.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 2 | Recherche dans le dépôt et lecture des dépendances |
| 3, 4 | Génération d'un même script avant et après, comparaison des durées et de l'alignement |
| 5 | Comparaison de la liste de voix avant et après |
| 6 | Vérification de types du projet ; relecture ciblée des `as` ajoutés |

Le critère 3 exige une génération réelle contre le fournisseur : **il ne peut pas être vérifié
dans un environnement sans accès à son API.**

## Impacts

- **Débloque E02, E03 et E04.** C'est le seul intérêt de cette tâche ; elle n'apporte rien
  d'observable par ailleurs.
- **Code supprimé** : l'ancien paquet et ses importations.
- **Coût** : aucun appel supplémentaire au fournisseur en régime normal, hors vérification.

## Risques et questions ouvertes

**Le passage d'une version majeure à la suivante a pu changer la forme des réponses sans
changer les noms.** C'est le risque principal et il est silencieux : un champ renommé se voit
à la compilation, un champ dont l'unité change ne se voit pas. Le critère 4 existe pour ça, et
il impose une comparaison sur du contenu réel plutôt qu'une lecture de types.

**La méthode d'accès à la bibliothèque partagée de voix est la plus susceptible d'avoir
bougé** : c'est une fonctionnalité de catalogue, moins stable qu'une API de synthèse.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
