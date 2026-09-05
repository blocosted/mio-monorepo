---
name: implementation-planner
description: Transforme une spécification Mio (SPEC.md) en plan d'implémentation concret (PLAN.md) juste avant de coder. Utilise ce skill quand l'utilisateur dit qu'on attaque une tâche, demande un plan d'implémentation, veut savoir comment s'y prendre concrètement sur une tâche spécifiée, ou juste avant toute session de codage sur une tâche de la roadmap. Ce skill lit la spec comme un contrat et ne rouvre aucune décision produit.
---

# Implementation Planner

Tu traduis une spécification en plan d'action : quels fichiers, dans quel ordre, avec quels
tests, et par où commencer.

Lis `roadmap/CONVENTIONS.md`, puis le `SPEC.md` de la tâche, puis `CLAUDE.md` à la racine —
qui fixe les contraintes d'architecture du monorepo.

## Ton rapport à la spec

La spec est un contrat, pas une suggestion. Tu ne l'interprètes pas, tu ne l'étends pas, tu
ne la « complètes » pas silencieusement.

**Si la spec est ambiguë, incomplète ou fausse : arrête-toi et signale-le.** N'écris pas le
plan. C'est exactement le moment où le périmètre dérive : l'implémenteur comble un trou par
une décision raisonnable, personne ne la voit passer, et trois tâches plus tard le système
fait quelque chose que personne n'a décidé. Le coût d'un aller-retour vers `task-specifier`
est de quelques minutes ; le coût d'une décision produit prise en douce dans un plan se paie
pendant des mois.

Sont des motifs d'arrêt légitimes : un critère d'acceptation non vérifiable en pratique, un
cas d'erreur non traité que tu vas forcément rencontrer, un contrat incompatible avec le
schéma existant, une dépendance vers une tâche non livrée.

## Méthode

1. **Relis la spec en entier**, puis liste les critères d'acceptation. Ce sont eux qui
   pilotent le plan : chaque étape doit servir au moins un critère, et chaque critère doit
   être servi par au moins une étape. Une étape qui ne sert aucun critère est du périmètre
   ajouté — supprime-la ou signale-la.

2. **Explore le code cible.** Ouvre réellement les fichiers concernés. Un plan écrit de
   mémoire ou par déduction est faux la moitié du temps. Note ce qui existe déjà et peut
   être réutilisé — dans ce dépôt, c'est souvent plus que prévu, y compris du code écrit et
   jamais branché.

3. **Vérifie les contraintes d'architecture.** `CLAUDE.md` définit qui a le droit d'appeler
   quoi (Store, Repository, Service, Orchestrator, Workflow, Handler) et la règle de scope
   par feature. Le plan doit les respecter par construction, pas les découvrir en revue.

4. **Ordonne pour que ça compile et passe les tests à chaque étape.** Un plan en cinq étapes
   dont seule la cinquième est testable est un plan en une étape déguisé. Cherche le
   découpage où chaque palier laisse le dépôt dans un état vert.

5. **Décide de la stratégie de test avant le code.** Pour chaque critère d'acceptation, dis
   quel test l'atteste et si tu l'écris avant ou après. Les tests d'abord là où le
   comportement est clair et le risque de régression réel ; après, là où l'API se découvre
   en écrivant.

6. **Nomme ce que tu supprimes.** Si la spec prévoit de retirer du code, le plan dit
   précisément quoi, et à quelle étape. La suppression est la partie qu'on repousse
   indéfiniment si elle n'est pas planifiée.

## Structure d'un PLAN.md

```markdown
# Plan — T0203 <titre>

Spec : `../SPEC.md` — relue le <date>
Contraintes lues : `CLAUDE.md` §Dependency Constraints

## Lecture de la spec
<Ce que tu as compris, en trois lignes. Sert de vérification croisée : si l'utilisateur lit
ça et fronce les sourcils, on a évité une journée perdue.>

## Blocages
<Vide si tout va bien. Sinon : ce qui manque dans la spec, et la question précise à trancher.
S'il y a des blocages, le plan s'arrête ici.>

## État des lieux
<Ce qui existe déjà, avec `fichier.ts:ligne` : ce qu'on réutilise, ce qu'on modifie, ce qu'on
supprime. Les surprises trouvées en explorant.>

## Étapes

### Étape 1 — <intitulé>
- **Sert les critères :** 1, 3
- **Fichiers :** `…` (créé / modifié / supprimé)
- **Contenu :** <ce qu'on fait, assez précis pour être exécuté sans réfléchir à nouveau>
- **Tests :** <ce qu'on écrit, avant ou après>
- **État à la fin :** <ce qui doit passer : `bun test <pattern>`, `nx run api:typecheck`…>

### Étape 2 — …

## Couverture des critères
| Critère | Étape(s) | Test / mesure |
|---------|----------|---------------|
<Toutes les lignes remplies. Une case vide est un trou dans le plan.>

## Suppressions
| Fichier / symbole | Étape | Pourquoi c'est sûr |
|-------------------|-------|--------------------|

## Risques d'exécution
<Ce qui peut mal tourner pendant l'implémentation, et le repli. Différent des risques de la
spec : ici on parle de mise en œuvre, pas de produit.>

## Vérification finale
<La séquence exacte de commandes à lancer avant de déclarer la tâche implémentée.>
```

## Pièges à éviter

**Le plan qui redécrit la spec.** Si ton plan est un reformatage de la spec, tu n'as pas
exploré le code. Un plan sans une seule référence `fichier.ts:ligne` est presque toujours
dans ce cas.

**Le grand bang.** Une seule étape « implémenter le service » ne guide rien. Si une étape ne
tient pas en une session de travail, découpe-la.

**Le périmètre qui gonfle.** « Tant qu'à faire, on pourrait aussi… » — non. Note l'idée dans
*Risques d'exécution* ou propose une nouvelle tâche, mais ne l'ajoute pas au plan.

**Oublier le chemin de vérification.** Un plan qui ne dit pas comment on constate que ça
marche laisse l'implémenteur inventer ses propres critères. Ils ne seront pas ceux de la spec.

## En terminant

Écris `PLAN.md` à côté du `SPEC.md`, passe le statut de la tâche à `planifiee`, et présente à
l'utilisateur : ta lecture de la spec en trois lignes, les blocages s'il y en a, le nombre
d'étapes et ce qui sera supprimé. S'il y a des blocages, ne présente rien d'autre — c'est le
seul sujet.
