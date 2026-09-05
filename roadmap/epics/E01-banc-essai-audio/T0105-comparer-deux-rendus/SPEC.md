---
id: T0105
epic: E01
titre: Comparer deux rendus
statut: specifiee
type: feature
depend_de: [T0104]
adr: []
research: []
hypotheses: []
effort: S
---

# T0105 — Comparer deux rendus

## Problème

Le critère de sortie 5 de E01 exige que le délai entre « je modifie un réglage » et « j'ai les
deux fichiers et leur écart sous les yeux » descende sous quinze minutes. Aujourd'hui, l'écart
entre deux rendus ne s'obtient qu'en relisant deux sorties de mesure côte à côte et en
soustrayant de tête.

C'est l'opération la plus fréquente du travail de réglage audio, et la seule qui prouve qu'une
modification améliore. Sans elle, on ne fait que des impressions — et on ne détecte aucune
régression.

## Objectif

Une commande met en regard deux exécutions et rend leur écart, critère par critère, avec le
sens de cet écart.

## Périmètre

**Dans :**
- La comparaison de deux exécutions par leur manifeste
- L'écart chiffré par critère, et son sens : rapprochement ou éloignement de la charte
- La comparaison des stems entre eux, pas seulement des mix
- Le signalement de ce qui n'est pas comparable

**Hors :**
- Le jugement d'écoute, qui relève du protocole du skill `audio-qa`
- L'affichage graphique, qui est E07
- La comparaison de plus de deux exécutions

## Comportement attendu

### Cas nominal

La commande reçoit deux exécutions et rend, pour chaque critère de la charte : la valeur de
chacune, l'écart, et si cet écart rapproche ou éloigne de la charte. Un critère inchangé est
identifié comme tel — c'est une information, pas du bruit.

Le résultat distingue trois familles : ce qui s'est amélioré, ce qui s'est dégradé, ce qui n'a
pas bougé. La dégradation est ce qu'on cherche : c'est le seul moyen d'attraper une régression
qu'on n'attendait pas.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Les deux exécutions n'ont pas été jugées contre la même version de charte | La comparaison aboutit mais le signale nettement : les verdicts ne sont pas comparables, seules les valeurs le sont |
| Un critère vaut `null` dans une exécution et pas dans l'autre | L'écart est déclaré non calculable, avec la raison de chaque côté |
| Une exécution est marquée incomplète | La comparaison est refusée |
| Les deux exécutions portent sur des scènes différentes | La comparaison aboutit mais le signale : comparer des rendus de contenus différents n'a pas de sens pour les blancs |
| Un stem existe d'un côté seulement | Il est listé comme ajouté ou retiré, pas comme un écart |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Un manifeste est introuvable ou illisible | Arrêt, en nommant l'exécution | **échec** | sortie d'erreur |
| Une exécution est incomplète | Arrêt, en le disant | **échec** | sortie d'erreur |
| Les manifestes sont de versions de structure différentes | Arrêt plutôt que comparaison approximative | **échec** | sortie d'erreur |

## Contrats

### Résultat de comparaison

Un document portant, pour chaque critère : la valeur de chaque exécution, l'écart, le sens de
l'écart par rapport à la charte, et un état parmi améliore, dégrade, inchangé, non comparable.
Le document porte aussi les avertissements de comparabilité (charte différente, scène
différente).

## Critères d'acceptation

1. Comparer une exécution avec elle-même produit un écart nul sur tous les critères, et
   aucun n'est classé améliore ou dégrade.
2. Comparer deux exécutions dont une valeur a empiré classe ce critère en dégradation, quel
   que soit le sens de la variation numérique — un niveau qui monte peut être une
   amélioration ou une dégradation selon la charte.
3. Une exécution incomplète fait échouer la comparaison.
4. Deux exécutions jugées contre des versions de charte différentes produisent un
   avertissement explicite.
5. Un critère `null` d'un seul côté est déclaré non comparable, avec la raison de chaque côté.
6. La comparaison n'accède à aucun fichier autre que les deux manifestes.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 2, 5 | Tests unitaires sur des manifestes construits pour l'épreuve |
| 3, 4 | Tests sur le code de sortie et les avertissements |
| 6 | Lecture du code ; aucun accès au système de fichiers hors manifestes |

## Impacts

- **Sert le critère de sortie 5 de E01**, qui chronomètre la boucle de retour.
- **Sera réutilisé par E07** pour l'affichage côte à côte.
- Aucun impact sur le pipeline de production.

## Risques et questions ouvertes

**Le sens d'un écart n'est pas toujours évident.** Pour un seuil à fenêtre — le niveau
intégré, la médiane des blancs — s'approcher du centre de la fenêtre est une amélioration,
mais le centre n'est pas nécessairement l'optimum. La spec impose que le sens soit calculé par
rapport à la charte et non par rapport au signe de la variation ; **la définition exacte de
« se rapprocher » pour un seuil à fenêtre reste à trancher à l'implémentation**, et à écrire.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
