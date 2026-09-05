---
id: T0104
epic: E01
titre: Compléter le magasin de runs
statut: specifiee
type: feature
depend_de: [T0101, T0103]
adr: []
research: []
hypotheses: []
effort: S
---

# T0104 — Compléter le magasin de runs

## Problème

Un magasin d'exécutions existe (`packages/scripts/src/_local-run-store/run-store.ts`) et
conserve déjà, par étape, les entrées et sorties sous `.mio-data/`. Les stems y sont écrits.

Il manque ce qui rend une exécution **jugeable après coup** : le script exactement utilisé, les
mesures produites, et la version de la charte contre laquelle le verdict a été rendu. Sans
cela, une exécution d'il y a trois semaines est un tas de fichiers audio dont on ne peut plus
dire ni ce qui les a produits, ni s'ils étaient conformes, ni à quoi ils se comparent.

C'est la différence entre archiver et pouvoir comparer — et la comparaison est la raison
d'être de l'epic.

## Objectif

Toute exécution conserve de quoi être rejugée et comparée sans rien deviner.

## Périmètre

**Dans :**
- Le script exactement utilisé, tel qu'il a été consommé
- Les mesures de l'instrument, pour le mix et pour chaque stem
- L'identification de la charte utilisée et de sa version
- De quoi identifier l'exécution : date, script d'origine, scène, réglages notables

**Hors :**
- L'affichage ou la comparaison, qui sont T0105 et E07
- Toute purge ou rotation automatique du magasin
- La conservation en base de données : le magasin reste local et non versionné

## Comportement attendu

### Cas nominal

À l'issue d'une exécution, son répertoire contient tout ce qu'il faut pour répondre à trois
questions sans recourir à autre chose : qu'est-ce qui a été produit, à partir de quoi, et
était-ce conforme.

Les mesures sont produites pour le mix **et pour chaque stem séparément** — c'est ce qui
permet de constater qu'un mix conforme cache une musique inaudible.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Un stem est absent (pas de musique dans la scène) | Son absence est explicite, distincte d'une mesure ratée |
| L'instrument échoue sur un stem | L'exécution est conservée, la mesure de ce stem porte la raison de l'échec |
| Le script est volumineux | Il est conservé intégralement : c'est la seule façon de rejouer à l'identique |
| Deux exécutions du même script à la même seconde | Elles ne se marchent pas dessus |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Le répertoire du magasin n'est pas accessible en écriture | Arrêt avant génération, en nommant le chemin | **échec** | sortie d'erreur |
| L'écriture d'un artefact échoue | Arrêt, l'exécution est marquée incomplète | **échec** | sortie d'erreur |
| La charte est introuvable au moment de mesurer | L'exécution est conservée sans verdict, avec la raison | repli assumé | dans le manifeste |

Une exécution incomplète est marquée comme telle. Elle ne doit jamais être prise pour une
exécution réussie par un outil de comparaison.

## Contrats

### Manifeste d'exécution

Un document lisible par machine, dans le répertoire de l'exécution, portant : un identifiant
d'exécution, la date, le script source et la scène traitée, l'emplacement de chaque artefact,
les mesures du mix et de chaque stem, l'identification et la version de la charte, l'état de
l'exécution (complète ou incomplète), et les réglages qui ont influé sur le rendu.

Un consommateur qui lit ce seul document doit pouvoir situer et juger l'exécution sans
explorer le système de fichiers.

## Critères d'acceptation

1. Le répertoire d'une exécution contient le script exactement utilisé, et le rejouer produit
   la même liste d'artefacts.
2. Le manifeste porte les mesures du mix et de chaque stem présent.
3. Le manifeste porte l'identification et la version de la charte ayant servi au verdict.
4. Un stem absent est distinguable, dans le manifeste, d'un stem dont la mesure a échoué.
5. Une exécution interrompue est marquée incomplète, et un outil de comparaison la refuse.
6. Un consommateur du manifeste seul peut situer tous les artefacts sans listage de
   répertoire.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1 | Test d'intégration : rejouer le script conservé, comparer la liste d'artefacts |
| 2, 3, 4 | Tests sur la structure du manifeste |
| 5 | Test d'intégration interrompant une exécution |
| 6 | Lecture du code de T0105, qui ne doit lire que le manifeste |

## Impacts

- **Prérequis de T0105** : la comparaison lit les manifestes, pas le système de fichiers.
- **Prérequis de E07** : le backoffice affichera ces mêmes données.
- Le magasin grossit : chaque exécution conserve désormais un script complet. Pas de purge
  prévue ici, à surveiller.
- Aucun impact sur le pipeline de production.

## Risques et questions ouvertes

**Le volume du magasin n'est pas borné.** Conserver script, stems et mix par exécution
consomme rapidement de l'espace. Une politique de rétention sera nécessaire, mais la définir
avant de connaître le rythme réel d'utilisation serait arbitraire. **Question ouverte,
volontairement reportée** — à traiter quand la gêne se manifestera, pas avant.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
