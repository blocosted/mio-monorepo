---
name: epic-designer
description: Découpe une intention produit en epics pour le projet Mio, et écrit chaque epic dans roadmap/epics/. Utilise ce skill dès que l'utilisateur parle de découper le travail, de structurer la roadmap, de créer ou revoir des epics, de prioriser des chantiers, de « par où on commence », ou qu'il décrit une ambition produit encore floue qu'il faut transformer en lots livrables. Utilise-le aussi pour revoir un découpage existant qui a dérivé, ou pour insérer un nouveau chantier dans une roadmap déjà en place.
---

# Epic Designer

Tu transformes une intention produit en un découpage en epics : des lots de travail dont le
résultat s'observe, s'écoute ou se mesure.

Commence par lire `roadmap/CONVENTIONS.md`. Il fixe le nommage, le front matter et
l'arborescence. Lis ensuite `roadmap/PRODUIT.md` s'il existe : un epic qui ne sert aucun
objectif de ce document est probablement une fausse bonne idée.

## Ce qu'est un epic ici

Un epic est **un résultat perceptible**, pas une couche technique.

- ✅ « Le mix final tient la charte sonore sans intervention manuelle »
- ✅ « Un parent peut créer un compte, un profil enfant, et écouter une histoire »
- ❌ « Refactoriser la couche service » — personne ne perçoit rien
- ❌ « Migrer vers ElevenLabs » — c'est un moyen, pas un résultat

Le test : **peux-tu écrire une phrase qui commence par « après cet epic, je peux… » et qui se
termine par quelque chose que tu constates de tes propres yeux ou oreilles ?** Si non, ce
n'est pas un epic, c'est une tâche ou une catégorie de rangement.

Taille : un epic doit être livrable en 1 à 3 semaines à la capacité de développement du
projet, qui est réduite et discontinue. Plus gros, il ne se termine jamais. Plus petit, c'est
une tâche.

## Le critère d'ordonnancement pour ce projet

Mio a une caractéristique dominante : **le produit n'a pas encore d'auditeur extérieur, et la
boucle de retour audio est lente**. Ordonne donc les epics par *délai avant de pouvoir écouter
le résultat*, pas par dépendance technique pure.

Concrètement : ce qui raccourcit la boucle d'écoute passe avant ce qui améliore l'écoute. Un
outillage qui permet de générer et comparer dix versions d'une scène en une heure vaut plus,
à ce stade, qu'une amélioration ponctuelle de la voix — parce qu'il rend toutes les
améliorations suivantes moins chères.

Deuxième critère, seulement ensuite : ce qui débloque le plus d'autres epics.

## Méthode

1. **Lis le contexte.** `roadmap/CONVENTIONS.md`, `roadmap/PRODUIT.md`, les epics existants,
   les ADR (`roadmap/decisions/`), et `roadmap/archive/` s'il y a un historique. Une intention
   passée abandonnée est une information : sache pourquoi elle a été abandonnée avant de la
   ressusciter.

2. **Explore le code réel avant de découper.** Un découpage écrit sans avoir regardé le code
   produit des epics qui ne correspondent à rien. Cherche notamment ce qui existe déjà et
   fonctionne — c'est souvent plus que prévu — et ce qui existe mais n'est jamais appelé.

3. **Nomme les résultats, puis regroupe.** Écris d'abord la liste des « après ça, je peux… ».
   Regroupe ensuite ceux qui partagent la même matière technique. C'est plus fiable que de
   partir des couches du code.

4. **Écris le hors-périmètre.** C'est la section la plus utile d'un epic et celle qu'on saute
   toujours. Elle t'évitera de rouvrir trois fois la même discussion.

5. **Liste les tâches sans les spécifier.** Un titre et une phrase d'intention par tâche.
   La spécification est le métier de `task-specifier`, plus tard, une tâche à la fois. Écrire
   les specs maintenant, c'est spécifier avec les informations d'aujourd'hui du travail qui
   sera fait dans deux mois.

6. **Propose un ordre et défends-le.** Une roadmap sans ordre argumenté est une liste de
   courses.

## Structure d'un EPIC.md

```markdown
---
id: E02
titre: <titre court>
statut: a-faire
depend_de: []
adr: []
objectif_mesurable: "<une phrase, vérifiable>"
---

# E02 — <Titre>

## Après cet epic, je peux…
<Une à trois phrases à la première personne, constatables.>

## Pourquoi maintenant
<Ce que cet epic débloque, ce qu'il coûte de le repousser. Si la réponse est « rien »,
l'epic est mal placé dans l'ordre.>

## Périmètre

**Dans :**
- …

**Hors :**
- … <et pourquoi : « traité par E04 », « pas avant d'avoir des utilisateurs », « décision
  reportée à ADR-XXXX ».>

## Critères de sortie
<Numérotés, observables, mesurables. C'est ce qui autorise à déclarer l'epic livré.
Trois à six suffisent. S'il en faut douze, l'epic est trop gros.>

1. …

## Tâches pressenties
<Titre + une phrase d'intention. Pas de spec. L'ordre indicatif est utile ; il sera revu.>

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|

## Dépendances et risques
<Ce qui doit exister avant. Ce qui pourrait faire échouer l'epic, et le signal qui
préviendrait.>

## Questions ouvertes
<Ce qui reste à décider, et par qui. Une question ouverte assumée vaut mieux qu'une
hypothèse implicite.>
```

## Pièges à éviter

**Le découpage par couche technique.** « Epic backend », « epic frontend », « epic base de
données ». Rien n'est livrable, tout dépend de tout, et on n'écoute jamais rien.

**L'epic fourre-tout.** Un epic « Divers / Dette technique » absorbe silencieusement tout ce
qu'on ne veut pas décider. Rattache chaque élément de dette à l'epic qui en souffre, ou
crée un epic de dette avec un critère de sortie réel.

**Le découpage exhaustif dès le départ.** Découper les six prochains mois donne une illusion
de contrôle et périme en trois semaines. Découpe finement les deux ou trois premiers epics,
grossièrement les suivants, et assume que la suite bougera.

**Confondre un jalon et un epic.** « MVP » n'est pas un epic, c'est une date. Un jalon
regroupe des epics ; il vit dans `roadmap/README.md`.

## En terminant

- Crée les répertoires `roadmap/epics/E<NN>-<slug>/` et les `EPIC.md`.
- Invoque `roadmap-keeper` pour régénérer l'index et vérifier la cohérence.
- Résume à l'utilisateur : l'ordre proposé, l'argument principal de cet ordre, et les
  questions ouvertes qui attendent sa décision. Ne noie pas le résumé dans le détail : il
  a les fichiers pour ça.
