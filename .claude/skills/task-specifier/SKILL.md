---
name: task-specifier
description: Écrit la spécification détaillée d'une tâche du projet Mio dans roadmap/epics/<epic>/<tache>/SPEC.md, après exploration du code existant et veille technique. Utilise ce skill dès que l'utilisateur demande de spécifier une tâche, d'écrire une spec, de « détailler » ou « creuser » un élément de la roadmap, de préparer une tâche avant implémentation, ou qu'il pointe une tâche d'un epic en disant qu'on s'y attaque. Utilise-le aussi pour reprendre une spec existante jugée insuffisante. Ce skill écrit des spécifications, jamais des plans d'implémentation.
---

# Task Specifier

Tu écris la spécification d'une tâche : ce qu'il faut obtenir, pourquoi, et comment on
saura que c'est obtenu. Tu n'écris pas comment y arriver.

Lis d'abord `roadmap/CONVENTIONS.md` — en particulier la section 2, qui définit la
frontière spec / plan, et la section 5, qui liste les règles de fond du projet.

## La règle qui gouverne tout le reste

**Le test des trois implémentations.** Relis ta spec en te demandant : trois développeurs
compétents pourraient-ils l'implémenter de trois façons différentes, toutes trois
satisfaisant l'intégralité des critères d'acceptation ? Si oui, tu es au bon niveau. Si une
seule façon peut passer, tu as écrit un plan et tu as volé sa liberté à l'implémenteur — qui
en sait souvent plus que toi sur l'état réel du code au moment où il agit.

La raison profonde : une spec doit survivre à une réécriture complète de l'implémentation.
C'est ce qui la rend utile dans six mois, quand le code aura bougé.

Les **contrats** échappent à cette règle et ont leur place dans la spec : forme d'une réponse
d'API, colonne de base de données, schéma JSON, invariant, format de fichier. Ce sont des
comportements observables de l'extérieur, pas des choix internes.

## Méthode

### 1. Rassembler le contexte

Lis, dans cet ordre : l'`EPIC.md` parent, les ADR cités, les notes de `roadmap/research/`
citées, et les specs des tâches dont celle-ci dépend. Une spec qui contredit un ADR accepté
est un défaut : soit tu t'es trompé, soit l'ADR doit être révisé — dis-le, ne tranche pas
seul.

### 2. Explorer le code réel

C'est non négociable et c'est ce qui distingue une spec utile d'une dissertation. Tu dois
savoir ce qui existe avant de dire ce qui doit exister.

Cite tes trouvailles au format `chemin/fichier.ts:123`. Une spec qui affirme « le service
actuel ne gère pas X » sans référence est une opinion.

Cherche en particulier :
- ce qui fait déjà le travail, même mal — on répare plus souvent qu'on ne crée
- ce qui existe mais n'est jamais appelé — le projet en contient beaucoup
- les valeurs de repli silencieuses sur le chemin concerné
- les endroits où la même donnée est calculée deux fois

### 3. Combler les inconnues

Si la tâche dépend d'un comportement d'API externe, d'une limite, d'un tarif ou d'une
capacité de modèle que tu ne peux pas vérifier depuis le code : **n'invente pas et ne te fie
pas à ta mémoire**, les API bougent vite. Invoque `tech-scout`, qui produira une note datée
et sourcée dans `roadmap/research/`, et cite-la dans le front matter.

Si l'inconnue est « est-ce que ça sonne bien », c'est un spike, pas une spec : invoque
`spike-runner`.

Si l'inconnue est une décision produit qui t'appartient pas, ouvre une question. Une question
ouverte assumée dans une spec vaut infiniment mieux qu'une hypothèse implicite qu'on
découvrira à la revue.

### 4. Écrire les comportements avant les critères

Décris d'abord ce que le système fait : cas nominal, cas limites, cas d'erreur. Les critères
d'acceptation se déduisent ensuite presque mécaniquement. Faire l'inverse produit des
critères qui décrivent l'implémentation.

Traite explicitement, pour chaque cas d'erreur : **est-ce qu'on échoue, ou est-ce qu'on
retombe sur une valeur par défaut ?** Si c'est un repli, il est journalisé avec son contexte.
Le silence est interdit (`CONVENTIONS.md` §5).

### 5. Rendre chaque critère falsifiable

Un critère d'acceptation dont tu ne sais pas énoncer la façon de le prouver faux n'est pas
encore écrit. Interdis-toi *fluide*, *naturel*, *propre*, *performant*, *amélioré*, *robuste*
— sauf immédiatement suivis d'une mesure et d'un seuil.

Pour tout critère portant sur le rendu sonore, exprime-le en grandeurs que `audio-qa` sait
mesurer (LUFS, dBTP, LU, millisecondes, dB relatifs entre stems) et référence la charte
sonore de `roadmap/PRODUIT.md`. « La musique ne couvre pas la voix » devient « le niveau
intégré du stem musique est 18 à 22 LU sous celui du stem voix ».

### 6. Se relire avec la checklist

Passe la spec au crible de `references/checklist-spec.md` avant de la présenter. Cette
relecture attrape en deux minutes ce qui coûterait une journée d'implémentation à découvrir.

## Structure d'un SPEC.md

```markdown
---
id: T0203
epic: E02
titre: <titre>
statut: specifiee
type: feature | fix | refonte | spike | chore | dette
depend_de: []
adr: []
research: []
effort: S | M | L | XL
---

# T0203 — <Titre>

## Problème
<Ce qui ne va pas aujourd'hui, avec des preuves : références `fichier.ts:ligne`, mesures,
extraits de log. Pas de généralités.>

## Objectif
<Une phrase. Observable. Si tu as besoin de deux phrases, il y a peut-être deux tâches.>

## Périmètre

**Dans :** …

**Hors :** … <avec la raison>

## Comportement attendu

### Cas nominal
<Ce que fait le système quand tout se passe bien. Écris-le comme une observation
extérieure, pas comme une suite d'appels.>

### Cas limites
<Entrée vide, valeur extrême, collection à un seul élément, contenu inattendu du LLM…>

### Cas d'erreur
| Situation | Comportement | Échec ou repli ? | Journalisation |
|-----------|--------------|------------------|----------------|

## Contrats
<Schémas d'API, colonnes, formats JSON, invariants. Précis et complets — c'est la partie de
la spec qui a le droit d'être littérale.>

## Critères d'acceptation
<Numérotés, falsifiables, indépendants. Chacun doit pouvoir être coché ou non sans débat.>

1. …

## Stratégie de vérification
<Pour chaque critère, comment on le prouve : test unitaire, test d'intégration, mesure
`audio-qa`, écoute selon le protocole, inspection manuelle. Un critère sans moyen de
vérification est un vœu.>

| Critère | Moyen de vérification |
|---------|----------------------|

## Impacts
<Migration de données, compatibilité ascendante, coût d'API, temps de génération, code
supprimé. Le code supprimé compte comme un livrable : nomme-le.>

## Risques et questions ouvertes
<Ce qui pourrait mal tourner. Ce qui reste à décider et par qui.>

---
*Cette spécification décrit un résultat attendu, pas une implémentation. Le plan
d'implémentation sera produit séparément par `implementation-planner` au moment de coder.*
```

## En terminant

- Écris le fichier, mets à jour le statut de la tâche dans l'`EPIC.md` parent.
- Invoque `roadmap-keeper` si tu as créé des dépendances ou des références croisées.
- Présente à l'utilisateur : l'objectif en une phrase, les décisions que tu as prises en son
  nom, et les questions ouvertes. Les questions ouvertes en premier — c'est ce sur quoi il
  doit agir.
