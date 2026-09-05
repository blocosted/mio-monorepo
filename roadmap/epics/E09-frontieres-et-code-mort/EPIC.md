---
id: E09
titre: Frontières et code mort
statut: a-faire
depend_de: [E04]
adr: []
objectif_mesurable: "Aucun package n'importe une app, aucun export n'est injoignable, et un contrôle automatique le vérifie"
---

# E09 — Frontières et code mort

## Après cet epic, je peux…

Modifier un package sans craindre d'entraîner la compilation d'un serveur qui n'a rien à
voir, et savoir qu'aucun code du dépôt n'est écrit sans être appelé.

## Pourquoi maintenant

Ce n'est pas un epic de rangement : chacun de ces défauts a un effet observé. Le cycle entre
le package partagé et l'application serveur fait que toute application front tire le graphe
complet du serveur — et plus lourd encore, dix-sept fichiers de `packages/scripts` importent
l'application serveur **à l'exécution**, pas seulement en type. Le contrôle automatique des
frontières n'est pas neutralisé par l'absence de manifestes : il n'est pas installé du tout,
aucune configuration ESLint n'existant dans le dépôt. Et 748 lignes de services soignés n'ont
jamais été appelées — le pipeline empruntait systématiquement le chemin le plus naïf, sans que
rien ne le signale.

Il vient après E04 parce que les epics audio suppriment eux-mêmes une grande partie du code
mort : le faire avant reviendrait à ranger une pièce qu'on va vider.

## Périmètre

**Dans :** extraction des contrats d'API dans un package sans dépendance vers une
application · manifestes et points d'entrée explicites pour chaque package · protection des
modules réservés au serveur · contrôle automatique des frontières · détection des exports
injoignables · mise à jour de `CLAUDE.md`.

**Hors :** toute réorganisation qui ne corrige pas un défaut observé. On ne déplace pas des
fichiers pour la beauté du geste.

## Critères de sortie

1. Aucun fichier de `packages/` n'importe depuis `apps/`, même en import de type.
2. Chaque package a un manifeste et des points d'entrée explicites.
3. Un module réservé au serveur importé depuis un composant client échoue à la compilation.
4. Un contrôle automatique vérifie les frontières et échoue en cas de violation.
5. Un contrôle liste les exports injoignables ; la liste est vide ou justifiée ligne à ligne.
6. `CLAUDE.md` décrit l'arborescence réelle.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0901 | Package de contrats | Extraire les schémas d'API dans un package sans dépendance vers une application, pour rompre le cycle de type. Ne règle pas les imports d'exécution de `packages/scripts` : trancher si les scripts sont une application ou un package est une décision à part. | M |
| T0902 | Manifestes de packages | Manifestes et points d'entrée explicites, pour rendre le contrôle des frontières opérant. | M |
| T0903 | Protection serveur | Empêcher qu'un module serveur soit importé côté client. | S |
| T0904 | Contrôle des frontières | **Installer** un mécanisme de contrôle des frontières — il n'en existe aucun — et le brancher sur la vérification locale. | M |
| T0905 | Chasse au code mort | Détecter et supprimer les exports injoignables. | M |
| T0906 | Documentation à jour | Aligner `CLAUDE.md` sur la réalité. | S |

## Dépendances et risques

Dépend de **E04**.

**Risque :** l'extraction des contrats touche à la fois l'API et ses clients ; une erreur se
voit à la compilation, pas à l'exécution — donc peu dangereuse mais potentiellement longue.

## Questions ouvertes

Aucune. Les défauts sont identifiés et les corrections connues.
