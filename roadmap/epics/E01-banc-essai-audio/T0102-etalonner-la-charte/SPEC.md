---
id: T0102
epic: E01
titre: Étalonner la charte sonore sur des références commerciales
statut: specifiee
type: chore
depend_de: [T0101]
adr: []
research: []
hypotheses: []
effort: S
---

# T0102 — Étalonner la charte sonore sur des références commerciales

## Problème

`roadmap/audio/charte.json` porte la mention `"_version": "0.1.0-hypothese"`. Ses seuils sont
**déduits d'un raisonnement, pas mesurés** : ils viennent du principe posé en
`PRODUIT.md` §7 — une histoire du soir s'écoute à faible volume, sur un petit haut-parleur,
dans le noir — et non de l'observation d'œuvres réelles.

Tant qu'ils ne sont pas confrontés à des productions du commerce, `audio-qa` peut déclarer
« conforme » un rendu qui ne soutient pas la comparaison, ou « hors charte » un rendu
parfaitement acceptable. Tous les critères de sortie chiffrés des epics audio en dépendent :
E04 critère 1 et 2, E02 critère 1, E03 critère 1.

## Objectif

La charte est fondée sur des mesures d'œuvres réelles, et chaque écart entre un seuil et ce
que font ces œuvres est justifié par écrit.

## Périmètre

**Dans :**
- La mesure d'au moins deux histoires audio commerciales
- La comparaison seuil par seuil entre la charte et ces mesures
- La révision des seuils, ou la justification écrite de leur maintien
- Le versement des mesures de référence dans `roadmap/audio/references/`

**Hors :**
- La fiabilité de l'instrument — c'est T0101, dont cette tâche dépend entièrement
- Les seuils d'équilibre entre stems (`_equilibreStems`) : une œuvre finalisée ne permet pas
  de mesurer ses stems séparément, ils resteront des hypothèses jusqu'à ce que nos propres
  rendus permettent de les valider à l'écoute

## Comportement attendu

### Cas nominal

Chaque œuvre de référence est mesurée par le même instrument que nos rendus, et le résultat
est versé dans `roadmap/audio/references/` sous une forme comparable. Une note de comparaison
met en regard, seuil par seuil, la valeur de la charte et celles observées.

Chaque seuil aboutit à l'une de trois issues, toutes écrites : **révisé** avec la nouvelle
valeur et la mesure qui l'a motivée ; **maintenu malgré l'écart**, avec la raison — c'est le
cas attendu pour les seuils qui traduisent un choix produit assumé, comme une plage de
loudness plus resserrée que l'usage ; **non étalonnable**, avec la raison.

`charte.json` passe en version `1.0.0` et perd la mention d'hypothèse.

### Cas limites

| Situation | Comportement attendu |
|---|---|
| Une seule œuvre disponible | La tâche aboutit, mais la note le signale : un seul point ne fait pas une référence, et les seuils restent marqués comme faiblement étalonnés |
| Les œuvres divergent fortement entre elles | On ne moyenne pas : la note rapporte la dispersion, et le seuil retenu est justifié par rapport à l'intention produit, pas par une moyenne |
| Une œuvre est hors du segment visé | Elle est mesurée et conservée, mais identifiée comme telle et écartée du calcul des seuils |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| Aucune œuvre de référence fournie | La tâche ne peut pas commencer | **échec** | signalé comme bloquant dans l'index |
| Une œuvre n'est pas décodable | Elle est écartée, nommément, dans la note | repli assumé | dans la note de comparaison |
| L'instrument produit `null` sur un critère pour toutes les œuvres | Ce seuil est déclaré non étalonnable | repli assumé | dans la note |

## Contrats

### Fiche de référence

Un fichier par œuvre dans `roadmap/audio/references/`, contenant la sortie de l'instrument,
la version de la charte utilisée, la date, et une identification de l'œuvre suffisante pour la
retrouver — sans versionner le fichier audio lui-même.

### Charte révisée

`roadmap/audio/charte.json` conserve sa structure. Sa version passe à `1.0.0`. Chaque seuil
modifié est justifié dans `PRODUIT.md` §7, qui reste l'unique endroit où le *pourquoi* est
écrit — les valeurs, elles, ne sont pas recopiées.

## Critères d'acceptation

1. `roadmap/audio/references/` contient les mesures d'au moins deux œuvres commerciales,
   produites par l'instrument issu de T0101.
2. Une note de comparaison met en regard, pour chacun des critères de la charte, la valeur
   du seuil et les valeurs observées.
3. Chaque critère de la charte porte une issue écrite : révisé, maintenu avec sa raison, ou
   non étalonnable avec sa raison. Aucun critère sans issue.
4. `charte.json` est en version `1.0.0` et ne porte plus la mention d'hypothèse.
5. Tout seuil modifié a sa justification mise à jour dans `PRODUIT.md` §7, sans que la valeur
   numérique y soit recopiée.
6. Aucun fichier audio n'est versionné.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1, 6 | Inspection du répertoire |
| 2, 3 | Lecture de la note de comparaison |
| 4 | Lecture de `charte.json` |
| 5 | Lecture de `PRODUIT.md` §7, et recherche des valeurs numériques pour vérifier l'absence de recopie |

## Impacts

- **Débloque** tous les critères de sortie chiffrés des epics audio, qui reposent aujourd'hui
  sur des seuils non fondés.
- **Peut invalider des critères de sortie déjà écrits** : si un seuil bouge fortement, les
  epics qui le citent sont à relire. C'est attendu, et c'est le but.
- Aucun impact sur le code de production.

## Risques et questions ouvertes

**Le principe produit peut ne pas survivre à la mesure.** Si les œuvres commerciales
présentent une plage de loudness bien plus large que ce que la charte autorise, il faudra
trancher : soit le raisonnement de `PRODUIT.md` §7 est faux, soit c'est un choix différenciant
assumé. Ce n'est pas une décision d'implémentation. **Si l'écart concerne plus de trois
critères, c'est le raisonnement qu'il faut revoir, pas les chiffres** — et cela remonte à
`PRODUIT.md`, pas à cette tâche.

**Les œuvres de référence doivent être fournies de l'extérieur du dépôt.** C'est la seule
dépendance externe de cette tâche, et elle est bloquante.

---
*Cette spécification décrit un résultat attendu, pas une implémentation.*
