---
name: spike-runner
description: Encadre une expérience technique time-boxée sur le projet Mio — question, protocole, critère de décision écrit à l'avance, code jetable, verdict — dans roadmap/spikes/. Utilise ce skill quand l'utilisateur veut tester une approche avant de s'engager, dit « essayons voir », « est-ce que ça marcherait », « faisons un spike », veut comparer deux façons de faire, ou qu'une question ne peut se trancher qu'en écrivant du code et en écoutant le résultat. À utiliser aussi quand une spécification bute sur une incertitude que la documentation ne lève pas.
---

# Spike Runner

Tu encadres une expérience : une question précise, un protocole, une durée maximale, et un
verdict écrit. Le but d'un spike n'est pas de produire du code, c'est de **produire une
décision**.

Lis `roadmap/CONVENTIONS.md`.

## La discipline qui fait tout

**Le critère de décision s'écrit avant de lancer l'expérience.** C'est la seule règle qui
compte vraiment. Sans elle, on regarde le résultat et on rationalise : « c'est pas parfait
mais on peut sûrement améliorer », et on s'engage sur une voie qu'on n'a pas choisie. Avec
elle, le résultat tranche tout seul.

Le critère doit être formulé de façon à pouvoir dire **non**. « On verra si c'est mieux »
n'est pas un critère. « Si le blanc médian entre répliques est sous 400 ms et qu'aucune
transition ne dépasse 900 ms, on adopte l'approche » en est un.

Corollaire : si tu n'arrives pas à écrire le critère, c'est que la question est mal posée.
Retravaille la question, pas le protocole.

## Méthode

1. **Écris `SPIKE.md` en entier avant de coder.** Question, hypothèse, protocole, critère de
   décision, durée maximale. Fais-le valider par l'utilisateur — c'est trente secondes de
   lecture qui évitent une demi-journée d'exploration hors-sujet.

2. **Réduis à la plus petite expérience concluante.** Une scène, pas une histoire. Un cas,
   pas trois. La tentation est toujours de tester « pour de vrai », c'est-à-dire de
   construire le produit. Un spike qui dure plus qu'une journée n'est plus un spike : c'est
   une tâche non spécifiée.

3. **Le code du spike est jetable et il le sait.** Il vit dans `packages/scripts/src/spikes/`
   ou dans un fichier isolé, jamais dans le chemin de production. Pas de tests, pas
   d'abstraction, pas d'injection de dépendances. Optimiser la propreté d'un code qu'on va
   supprimer, c'est du temps volé à la question.

4. **Mesure, ne juge pas.** Chaque fois que c'est possible, produis des chiffres plutôt qu'une
   impression. Pour tout ce qui s'écoute, invoque `audio-qa` : il donne les mesures et le
   protocole d'écoute structuré. Un verdict appuyé sur « ça sonne mieux » ne convainc pas ton
   toi de dans trois semaines.

5. **Écris `VERDICT.md`, même — surtout — si le résultat est décevant.** Un spike négatif est
   un succès : il t'a évité de construire la mauvaise chose. Un spike sans verdict écrit est
   un échec, quel que soit le résultat, parce que l'information s'évapore.

6. **Décide du sort du code.** Trois options, à écrire explicitement : supprimé, conservé
   comme outil de diagnostic sous `packages/scripts/`, ou promu — auquel cas il devient
   l'objet d'une tâche spécifiée, réécrit proprement. Jamais « laissé là ».

## SPIKE.md — avant

```markdown
---
id: S01
titre: <titre>
statut: en-cours          # en-cours | conclu | abandonne
date_debut: 2026-09-05
time_box: 4h
concerne: [E02]
---

# S01 — <Titre>

## Question
<Une question fermée. Ce qu'on ne sait pas et qui bloque une décision.>

## Pourquoi on ne peut pas trancher sur documentation
<Si `tech-scout` suffisait, ce spike n'a pas lieu d'être.>

## Hypothèse
<Ce qu'on s'attend à observer. Écrite avant, pour pouvoir se tromper honnêtement.>

## Protocole
<Les étapes exactes. Le matériel d'entrée (quelle scène, quel fichier, quels réglages).
Ce qu'on mesure et comment.>

## Critère de décision
<Écrit AVANT l'expérience. Formulé pour pouvoir dire non.>

- **On adopte si :** …
- **On rejette si :** …
- **C'est non concluant si :** … <et alors, quelle est l'étape suivante>

## Time-box
<Durée maximale. Au-delà, on s'arrête et on conclut « non concluant ». Le dépassement de
time-box est une donnée, pas un échec personnel.>
```

## VERDICT.md — après

```markdown
# Verdict — S01 <titre>

Date : <date> · Temps réellement passé : <durée>

## Résultat
**adopté | rejeté | non concluant**

## Ce qu'on a observé
<Les faits, avec les chiffres. Les mesures `audio-qa` s'il y a lieu. Les surprises —
souvent la partie la plus précieuse.>

## Confrontation au critère
<Le critère écrit à l'avance, et si oui ou non il est atteint. Sans réécriture rétroactive
du critère : si tu as envie de le réécrire, dis-le et explique pourquoi, c'est en soi un
enseignement.>

## Ce que ça change
<Les décisions que ce résultat permet de prendre. Les ADR à écrire. Les specs à corriger
ou à annuler.>

## Sort du code
**supprimé | conservé comme outil | promu**
<Si promu : la tâche qui le reprendra.>

## Ce qu'on ne sait toujours pas
<Ce que ce spike n'a pas répondu, et si ça mérite un autre spike.>
```

## En terminant

Si le spike débouche sur une décision structurante, invoque `adr-writer` : le verdict dit
*ce qu'on a observé*, l'ADR dit *ce qu'on a décidé et ce qu'on a accepté de perdre*. Les deux
sont utiles et ne se remplacent pas.

Présente à l'utilisateur : le verdict, la confrontation au critère, et ce que ça change dans
la roadmap. Dans cet ordre.
