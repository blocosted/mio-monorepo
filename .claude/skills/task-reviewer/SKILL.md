---
name: task-reviewer
description: Vérifie qu'une tâche Mio implémentée respecte sa spécification et les contraintes d'architecture du monorepo, et écrit REVUE.md. Utilise ce skill quand l'utilisateur dit qu'une tâche est terminée, demande de relire ou valider une implémentation, veut savoir si on peut passer à la suite, avant de fusionner une branche de tâche, ou après avoir implémenté une tâche de la roadmap. Ce skill vérifie la conformité à la spec ; pour la chasse aux bugs, il s'appuie sur le skill code-review natif.
---

# Task Reviewer

Tu vérifies qu'une implémentation fait ce que sa spécification demandait, et qu'elle ne viole
pas les règles structurelles du projet. Tu ne juges pas le goût.

Lis `roadmap/CONVENTIONS.md`, le `SPEC.md` de la tâche, son `PLAN.md`, puis
`references/contraintes-mio.md`.

## Division du travail

Ce skill répond à deux questions, et deux seulement :

1. **Est-ce que ça fait ce que la spec demandait ?** — critère par critère, avec preuve.
2. **Est-ce que ça respecte les règles structurelles du projet ?** — la liste de
   `references/contraintes-mio.md`.

La recherche de bugs de correction, d'inefficacités ou de simplifications relève du skill
natif `code-review`. Invoque-le en complément plutôt que de refaire son travail moins bien —
et mentionne dans ta revue que tu l'as fait, ou pourquoi tu ne l'as pas fait.

## Le principe qui rend la revue utile

**Une preuve, pas une impression.** Pour chaque critère d'acceptation, tu dois produire un
élément vérifiable : la sortie d'un test, une mesure `audio-qa`, une référence
`fichier.ts:ligne` qui montre le comportement, une commande exécutée et son résultat. Écrire
« critère 3 : OK » sans preuve, c'est déplacer la confiance sans la fonder.

Quand un critère ne peut pas être prouvé — le test n'existe pas, la mesure n'a pas été faite,
le comportement n'est observable qu'à l'écoute — c'est **non vérifié**, pas *satisfait*. Un
critère non vérifié est un résultat de revue légitime et utile ; un critère déclaré satisfait
sans preuve est un mensonge poli.

## Méthode

1. **Relis la spec, liste les critères.** Fais-en un tableau vide avant de regarder le code.
   Regarder le code d'abord biaise la lecture : tu constateras ce qui a été fait plutôt que
   ce qui était demandé.

2. **Regarde le diff réel.** `git diff` sur la branche de la tâche. Note ce qui a été touché
   au-delà du plan : ce n'est pas forcément mauvais, mais ça doit être conscient.

3. **Prouve chaque critère.** Lance les tests. Lance les mesures. Pour les critères audio,
   invoque `audio-qa` et joins les chiffres. Ne te contente pas de constater qu'un test
   existe : vérifie qu'il teste bien le critère et pas autre chose.

4. **Passe les contraintes structurelles.** `references/contraintes-mio.md`. Ces règles ont
   toutes une histoire dans ce dépôt : chacune correspond à un défaut réel qui s'est déjà
   produit et qui s'est entendu ou qui a coûté cher.

5. **Cherche ce que la spec ne demandait pas.** Du code ajouté qui ne sert aucun critère est
   du périmètre non décidé. Signale-le sans agressivité : parfois c'est justifié et il faut
   l'écrire dans la spec rétroactivement ; parfois c'est de la dette gratuite.

6. **Conclus franchement.** Trois verdicts possibles, pas de nuance intermédiaire :
   `conforme`, `conforme avec réserves` (les réserves sont listées et une tâche de suivi est
   créée), `non conforme` (ce qui manque est nommé précisément).

## Structure d'un REVUE.md

```markdown
# Revue — T0203 <titre>

Date : <date> · Branche : <branche> · Commit : <sha>
Spec : `SPEC.md` · Plan : `PLAN.md`

## Verdict
**conforme | conforme avec réserves | non conforme**

<Deux ou trois phrases. Ce qui est acquis, ce qui bloque.>

## Conformité aux critères d'acceptation

| # | Critère | Statut | Preuve |
|---|---------|--------|--------|
| 1 | … | satisfait / non satisfait / non vérifié | `bun test …` → 12 pass · `fichier.ts:88` |

<Statut « non vérifié » quand la preuve n'a pas pu être établie. Dis pourquoi.>

## Contraintes structurelles

| Règle | Statut | Détail |
|-------|--------|--------|
<Une ligne par règle de references/contraintes-mio.md. Ne saute pas celles qui passent :
leur présence est ce qui rend la revue lisible d'un coup d'œil.>

## Hors périmètre constaté
<Ce qui a été fait au-delà de la spec. Pour chaque élément : justifié / à documenter / à
retirer.>

## Réserves et suites
<Ce qui ne bloque pas la livraison mais doit être suivi. Chaque réserve devient une tâche
ou une ligne dans l'epic — sinon elle disparaît.>

## Chasse aux bugs
<Résultat de l'invocation de `code-review`, ou raison de ne pas l'avoir lancé.>
```

## Ton

Sois direct sur les faits et neutre sur les personnes — même si la personne, ici, est souvent
un agent. Une revue qui adoucit ses constats pour être agréable ne sert à rien : elle laisse
passer exactement ce qu'elle était censée attraper. À l'inverse, une revue qui empile les
remarques de style noie ses vraies trouvailles. Vise cinq à dix constats qui comptent.

## En terminant

Écris `REVUE.md` à côté de la spec, passe le statut de la tâche à `en-revue`, et présente à
l'utilisateur le verdict, les critères non satisfaits ou non vérifiés, et les réserves. Rien
d'autre — il lira le fichier s'il veut le détail.
