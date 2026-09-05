---
id: T0106
epic: E01
titre: Compter le coût et la durée d'une génération
statut: specifiee
type: feature
depend_de: [T0103]
adr: []
research: [2026-09-05-elevenlabs-refonte-audio]
hypotheses: []
effort: S
---

# T0106 — Compter le coût et la durée d'une génération

## Problème

Rien ne mesure ce que coûte une histoire. La recherche sur le sujet ne donne qu'une note
d'archive de janvier 2026 — « ElevenLabs ≈ 0,40 $ par histoire » — et la veille du
5 septembre 2026 n'a pas pu confirmer les tarifs, les pages de tarification étant
inaccessibles.

C'est un angle mort qui devient coûteux au mauvais moment. `PRODUIT.md` §6 pose que « une
architecture élégante à 3 € l'histoire n'est pas viable », et ADR-0001 nomme parmi ses
déclencheurs de révision « le coût par histoire dépasse le double de l'estimation actuelle » —
un déclencheur qu'on ne peut pas guetter, faute d'instrument.

La refonte aggrave l'enjeu : régénérer un bloc de deux mille caractères au lieu d'un segment
change l'économie des reprises, sans qu'on sache de combien.

## Objectif

Chaque génération rend ce qu'elle a consommé et le temps qu'elle a pris, par étape.

## Périmètre

**Dans :**
- Le décompte des unités facturables consommées par appel externe, par étape
- La durée de chaque étape et de l'ensemble
- Le décompte des appels, en distinguant ceux servis par un cache
- Le versement de ces données dans le manifeste d'exécution

**Hors :**
- La conversion en devise : les tarifs ne sont pas établis et bougent. On compte des unités,
  ce qui reste vrai quand le tarif change
- Toute alerte ou plafond automatique
- Le suivi de consommation en production, qui relève de l'exploitation

## Comportement attendu

### Cas nominal

Une génération rend, par étape : le nombre d'appels externes, les unités facturables
consommées, le nombre d'appels évités par le cache, et la durée. Le total est calculé sur les
mêmes grandeurs.

Les appels servis par un cache sont comptés séparément et non comme des appels facturés :
c'est ce qui permet de mesurer l'effet réel du cache, et de ne pas confondre le coût d'une
première génération avec celui d'une reprise.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Une étape est ignorée | Elle apparaît avec des compteurs à zéro, distincts d'une absence de mesure |
| Une étape échoue après avoir consommé | Ce qui a été consommé est compté : un échec coûte, et c'est précisément ce qu'on veut voir |
| Un appel est réessayé | Chaque tentative est comptée : le coût réel inclut les reprises |
| Un fournisseur ne rend pas d'information de consommation | La grandeur est `null` avec la raison, jamais zéro |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Le comptage échoue | La génération n'échoue pas pour autant ; le compteur porte la raison | repli assumé | dans le manifeste |
| Une unité consommée n'est pas déterminable | `null` avec la raison | repli assumé | dans le manifeste |

Le comptage ne doit jamais faire échouer une génération : c'est un instrument, pas une
fonctionnalité. Mais son échec doit être visible, jamais confondu avec un coût nul.

## Contrats

### Section de coût du manifeste

Par étape et au total : nombre d'appels externes émis, nombre d'appels servis par un cache,
unités facturables par nature (caractères de synthèse, secondes de musique, secondes
d'effets), durée en millisecondes. Chaque grandeur est un nombre ou `null` avec sa raison.

Les unités sont nommées par ce qu'elles mesurent, jamais converties en devise.

## Critères d'acceptation

1. Une génération complète rend, par étape, le nombre d'appels, les unités consommées et la
   durée.
2. Une génération intégralement servie par le cache rend zéro appel facturé et un nombre
   d'appels évités non nul.
3. Une reprise après échec compte les tentatives, pas seulement la dernière.
4. Une étape ignorée est distinguable, dans le manifeste, d'une étape non mesurée.
5. Un échec du comptage ne fait pas échouer la génération, et se voit dans le manifeste.
6. Aucune conversion en devise n'apparaît nulle part.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1 | Test d'intégration sur une génération complète |
| 2 | Test d'intégration : deux générations identiques successives |
| 3 | Test avec un appel externe forcé en échec puis réussi |
| 4, 5 | Tests sur la structure du manifeste |
| 6 | Lecture du code et du manifeste |

## Impacts

- **Rend guettable un déclencheur de révision d'ADR-0001**, aujourd'hui invisible.
- **Alimente E07** (affichage du coût par histoire) et le relevé transverse de S01.
- **Touche le chemin de production** : le comptage se fait là où les appels externes sont
  émis, donc dans du code partagé avec le workflow. C'est le seul point de cette tâche qui
  sort du banc d'essai, et il doit rester sans effet sur le comportement.
- Aucune donnée nouvelle sur les personnes n'est collectée.

## Risques et questions ouvertes

**Le fournisseur peut ne pas rendre la consommation facturée.** Dans ce cas les unités doivent
être déduites de ce qu'on a envoyé — nombre de caractères, durée demandée. C'est une
approximation, et elle doit être identifiée comme telle dans le manifeste plutôt que présentée
comme une mesure.

**Le comptage traverse la frontière entre banc d'essai et production.** Le risque est d'y
introduire un défaut dans du code partagé. L'exigence d'absence d'effet sur le comportement
est un critère de revue, pas une intention.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
