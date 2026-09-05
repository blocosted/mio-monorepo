---
name: adr-writer
description: Rédige un Architecture Decision Record dans roadmap/decisions/ pour tracer une décision structurante du projet Mio, ses alternatives et ce qu'elle coûte. Utilise ce skill quand une décision d'architecture est prise ou sur le point de l'être : choix d'un fournisseur ou d'une API externe, frontière entre couches, modèle de données structurant, abandon délibéré d'une approche, compromis assumé sur la qualité, le coût ou la sécurité. Utilise-le aussi quand l'utilisateur dit « on décide que », « on part sur », « finalement on abandonne », ou après le verdict d'un spike.
---

# ADR Writer

Tu écris la mémoire des décisions : ce qu'on a choisi, contre quoi, et ce qu'on a accepté de
perdre.

Lis `roadmap/CONVENTIONS.md` §7, qui dit ce qui mérite un ADR et ce qui n'en mérite pas.

## Pourquoi ce skill existe

Ce projet avance par sessions espacées. Dans six semaines, quelqu'un regardera une portion
du code en se demandant pourquoi elle est faite comme ça — et la réponse aura disparu. Un ADR
n'est pas de la bureaucratie : c'est ce qui évite de défaire une décision dont on a oublié
les raisons, ou de re-débattre trois fois le même arbitrage.

Corollaire : **un ADR sans alternatives sérieuses ne vaut rien.** Si les options rejetées
sont des hommes de paille, le document ne documente rien — il justifie après coup. La partie
la plus utile d'un ADR, c'est le raisonnement qui a failli l'emporter.

## Le champ qu'on oublie toujours

Chaque ADR se termine par : **ce qui nous ferait revenir sur cette décision.**

C'est le champ le plus utile et le plus rare. Il transforme une décision figée en décision
révisable, et il te dit quoi surveiller. « Si le coût par histoire dépasse 0,80 € » ou « si
l'API sort de son statut alpha avec des ruptures » sont des déclencheurs concrets qu'on peut
guetter. Sans ce champ, une décision devient un dogme par simple usure du temps.

## Méthode

1. **Vérifie que ça mérite un ADR.** Une décision locale à une tâche vit dans la spec. Le
   test : *est-ce que quelqu'un pourrait raisonnablement décider l'inverse, et est-ce que
   revenir en arrière coûterait cher ?* Si les deux réponses sont oui, écris l'ADR.

2. **Reconstitue le contexte honnêtement.** Ce qui a forcé la décision : une contrainte, une
   mesure, un verdict de spike, une découverte de veille. Cite les sources —
   `roadmap/research/`, `roadmap/spikes/`, des références `fichier.ts:ligne`.

3. **Écris les options avant la décision.** Au moins deux alternatives réelles, chacune avec
   ce qu'elle apporte et ce qu'elle coûte. Si tu n'en trouves qu'une, cherche encore : soit
   la décision est triviale et n'a pas besoin d'ADR, soit tu n'as pas assez exploré.

4. **Nomme le prix.** Toute décision a un coût : une flexibilité perdue, une dépendance
   acceptée, une dette contractée, un risque assumé. Un ADR qui ne liste que des avantages
   est un ADR de complaisance, et il ne servira à rien quand le prix se présentera.

5. **Ne réécris pas l'histoire.** Un ADR remplacé n'est jamais supprimé ni modifié : il passe
   en statut `remplace-par-ADR-XXXX` et le nouveau explique ce qui a changé. La trajectoire
   des décisions est une information en soi.

## Structure

Fichier : `roadmap/decisions/ADR-<NNNN>-<slug>.md`, numérotation globale, jamais réutilisée.

```markdown
---
id: ADR-0002
titre: <titre à l'impératif ou au participe : « Déléguer la synthèse voix à … »>
statut: propose        # propose | accepte | remplace-par-ADR-XXXX | obsolete
date: 2026-09-05
concerne: [E02]
sources: [2026-09-05-elevenlabs-text-to-dialogue, S01-spike-dialogue]
---

# ADR-0002 — <Titre>

## Statut
<propose | accepte | remplacé par ADR-XXXX | obsolète> — <date>

## Contexte
<Ce qui a rendu cette décision nécessaire. Les faits, avec leurs sources. Les contraintes
qui bornent le choix : temps disponible, budget, compétences, dépendances existantes.
Écris-le pour quelqu'un qui n'a pas suivi.>

## Options envisagées

### Option A — <nom>
- **En quoi ça consiste :** …
- **Ce que ça apporte :** …
- **Ce que ça coûte :** …
- **Pourquoi on ne la retient pas :** … <ou « retenue »>

### Option B — <nom>
…

## Décision
<L'option retenue, et l'argument décisif. Pas la liste des arguments : celui qui a fait
pencher. S'il n'y en a pas un qui domine, dis que c'était serré — c'est une information
utile, elle signale une décision fragile à surveiller.>

## Conséquences acceptées
<Ce qu'on perd, ce qu'on s'interdit, ce qu'on devra payer plus tard. Sois précis :
« dépendance à une API en alpha, non déterministe » plutôt que « quelques risques ».>

## Ce qui nous ferait revenir dessus
<Les déclencheurs concrets et observables. C'est ce qu'on surveillera.>

- …

## Impacts
<Les epics, tâches et specs affectés. Les ADR que celui-ci remplace ou contredit.>
```

## Les ADR déjà identifiés

L'audit d'architecture a fait émerger trois décisions structurantes qui ne sont pas encore
tracées. Si elles n'existent pas dans `roadmap/decisions/` au moment où tu interviens,
propose-les :

- **Où passe la frontière moteur / contenu tiers**, et donc si une place de marché est
  atteignable sans refonte du modèle de données.
- **Le modèle de propriété des données** (compte, profil enfant, isolation), qui n'existe ni
  dans le schéma ni dans la roadmap et qui conditionne toute mise entre les mains de tiers.
- **Qui porte le temps dans le pipeline audio** : mesurer puis dériver, ou déléguer la
  synchronisation au fournisseur.

## En terminant

Écris l'ADR, référence-le depuis les epics et specs concernés, puis présente à l'utilisateur :
la décision en une phrase, l'argument décisif, le prix accepté, et le déclencheur de révision.
S'il s'agit d'un ADR `propose`, dis clairement que tu attends sa validation avant de passer
en `accepte`.
