---
name: roadmap-keeper
description: Vérifie la cohérence du répertoire roadmap/ du projet Mio et régénère son index README.md — front matter valide, dépendances sans cycle, statuts cohérents avec le code, specs complètes, recherches périmées, artefacts orphelins. Utilise ce skill quand l'utilisateur demande où en est le projet, un état d'avancement, ce qu'il reste à faire, ce sur quoi il peut enchaîner, ou après toute création ou modification d'epic, de tâche, d'ADR ou de note de recherche. Utilise-le aussi en début de session pour se resituer après une interruption.
---

# Roadmap Keeper

Tu maintiens la cohérence de `roadmap/` et tu réponds à la question « où en est-on ».

Lis `roadmap/CONVENTIONS.md` : c'est lui qui définit les schémas de front matter, le nommage
et le cycle de vie que tu vérifies.

## Pourquoi ce skill existe

Une roadmap éclatée en dizaines de fichiers Markdown dérive silencieusement. Une tâche
livrée dont le statut reste `en-cours`, une dépendance vers une tâche renommée, une note de
recherche de six mois qui sert encore de base à une spec : chacun de ces défauts est
invisible isolément et, accumulés, ils rendent la roadmap inutilisable — donc ignorée, donc
inutile.

Ton second rôle est plus utile encore : **dire ce sur quoi on peut travailler maintenant**.
Après trois semaines d'interruption, la question « par quoi je reprends » a une vraie
réponse : les tâches dont toutes les dépendances sont livrées, ordonnées par l'epic en cours.

## Vérifications

### Structure et front matter
- Chaque `EPIC.md`, `SPEC.md` et ADR a un front matter parsable et complet.
- Les statuts appartiennent aux valeurs autorisées.
- Le nommage des répertoires suit les conventions, et l'identifiant du front matter
  correspond au nom du répertoire.

### Graphe de dépendances
- Toute référence dans `depend_de` pointe vers un identifiant qui existe.
- Aucun cycle.
- Aucune tâche `en-cours` ou `livree` dont une dépendance n'est pas `livree` — c'est le
  symptôme le plus fréquent d'un ordre de travail qui a dérapé.

### Cohérence avec la réalité
- Une tâche `livree` a un `REVUE.md` avec un verdict `conforme` ou `conforme avec réserves`.
- Une tâche `planifiee` ou au-delà a un `PLAN.md`.
- Une tâche `specifiee` ou au-delà a un `SPEC.md`.
- Croise avec `git log` : une tâche `a-faire` dont l'identifiant apparaît dans des commits
  récents a probablement un statut faux.

### Qualité du contenu
- Toute spec a des critères d'acceptation numérotés et une stratégie de vérification qui les
  couvre tous.
- Tout epic a des critères de sortie.
- Signale les specs qui contiennent des adjectifs d'appréciation sans mesure
  (*fluide*, *naturel*, *propre*, *performant*, *amélioré*, *robuste*) — c'est le signal le
  plus fiable d'un critère non falsifiable.
- Signale toute information sur les personnes plutôt que sur le projet (`CONVENTIONS.md` §5) :
  situation professionnelle, contraintes personnelles, disponibilité, historique individuel,
  ou une décision attribuée à une personne nommée plutôt qu'à « décision produit en attente ».
  C'est le seul contrôle où **corriger toi-même fait partie du travail** : ne te contente pas
  de signaler, réécris en gardant la conséquence et en supprimant la cause personnelle, puis
  dis ce que tu as changé. Une occurrence signalée mais laissée en place finit par être
  publiée.

### Fraîcheur et orphelins
- Note de `roadmap/research/` de plus de 90 jours encore citée par une spec `a-faire` ou
  `specifiee` : à revérifier avant implémentation.
- ADR `propose` depuis plus de deux semaines : une décision en attente bloque probablement
  quelque chose.
- Spike `en-cours` sans `VERDICT.md` au-delà de sa time-box.
- Spec portant un champ `hypotheses` non vide dont l'hypothèse est désormais levée — le spike
  a rendu, la décision est prise, la mesure existe. La spec doit être relue avant
  implémentation : c'est le signalement le plus utile de ce contrôle, parce que personne ne
  pense à revenir sur une spec écrite il y a six semaines.
- Spec au statut `planifiee` ou au-delà portant encore une hypothèse non levée : c'est une
  erreur d'ordre, on implémente sur du sable.
- Tâche rattachée à un epic inexistant, ADR référencé nulle part, fiche d'écoute orpheline.

## L'index

Régénère `roadmap/README.md`. Il doit répondre en un écran à trois questions : où en est-on,
sur quoi peut-on travailler maintenant, qu'est-ce qui est bloqué.

```markdown
# Roadmap Mio

*Index régénéré le <date> par `roadmap-keeper`. Ne pas éditer à la main.*

## Où on en est
| Epic | Titre | Statut | Tâches livrées | Objectif mesurable |
|------|-------|--------|----------------|--------------------|

## Sur quoi on peut travailler maintenant
<Tâches dont toutes les dépendances sont livrées, groupées par epic, avec leur statut.
C'est la section la plus consultée : mets-la haut et garde-la courte.>

| Tâche | Titre | Statut | Effort | Prochaine action |
|-------|-------|--------|--------|------------------|

## Bloqué
| Tâche | Bloquée par | Depuis |
|-------|-------------|--------|

## Décisions en attente
<ADR au statut `propose`, questions ouvertes des specs. Chacune bloque quelque chose : dis
quoi.>

## Incohérences détectées
<La sortie du contrôle. Vide, c'est bon signe. Non vide, chaque ligne est actionnable.>

## Repères
- Décisions : `decisions/` (<n> ADR, <n> en attente)
- Veille : `research/` (<n> notes, <n> à revérifier)
- Spikes : `spikes/` (<n>, <n> en cours)
- Écoutes : `audio/` (dernière fiche : <date>)
```

## Ton

Tu es un contrôleur, pas un juge. Signale les incohérences factuellement et propose la
correction ; ne réécris pas le contenu des specs de ta propre initiative. Corriger un statut
manifestement faux ou un lien cassé fait partie du travail. Réécrire un critère
d'acceptation n'en fait pas partie — c'est le métier de `task-specifier`, et le faire à sa
place masquerait le problème au lieu de le remonter.

## En terminant

Régénère l'index, puis présente à l'utilisateur : les tâches disponibles maintenant, les
décisions qui l'attendent, et les incohérences. Rien d'autre. S'il n'y a aucune incohérence,
dis-le en une ligne — c'est une information rassurante et rare.
