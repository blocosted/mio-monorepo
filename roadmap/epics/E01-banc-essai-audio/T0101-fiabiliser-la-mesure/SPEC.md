---
id: T0101
epic: E01
titre: Fiabiliser la mesure audio
statut: specifiee
type: fix
depend_de: []
adr: []
research: []
hypotheses: []
effort: M
---

# T0101 — Fiabiliser la mesure audio

## Problème

`.claude/skills/audio-qa/scripts/analyse-audio.ts` est l'instrument sur lequel repose toute
la charte sonore, tout critère de sortie chiffré des epics audio, et l'étalonnage à venir sur
des références commerciales. **Il n'a jamais été exécuté de bout en bout** : `ffmpeg` n'était
pas disponible dans l'environnement où il a été écrit. Son analyse statique a révélé trois
défauts, dont deux le rendent trompeur plutôt qu'inexact.

**Le critère d'écrêtage est inopérant par construction.** `analyse-audio.ts:208-209` teste
`Peak count === 0`, où `Peak count` est la mesure `astats` comptant les occurrences du
maximum absolu du signal. Cette valeur vaut au moins 1 sur tout fichier non silencieux. Le
critère est donc **toujours en échec**, quel que soit le mix — un verdict permanent et faux,
qui masquerait un écrêtage réel en le noyant dans un échec systématique.

**Les seuils de la charte sont recopiés dans le script.** `analyse-audio.ts:29-47` duplique
les valeurs de `roadmap/audio/charte.json`. C'est une violation directe de la règle de source
unique (`CONVENTIONS.md` §5) — dans l'outil même qui est censé faire respecter la charte. Deux
conséquences : sans `--charte`, ce sont les copies qui font foi ; et la fusion
`{ ...SEUILS_DEFAUT, ...json }` (`:233`) remplace **en silence** toute clé renommée dans le
JSON par sa copie périmée.

**Le parsing n'a jamais été confronté au réel.** Les expressions régulières qui lisent
`ebur128` (`:92-101`), `astats` (`:120-124`) et `silencedetect` (`:135-143`) ont été écrites
de mémoire. Le repérage du silence de tête repose sur une heuristique non validée
(`:147-148`, `premierDebut < 0.05`) et celui du silence de queue sur un déséquilibre entre le
nombre de débuts et de fins (`:151-155`).

## Objectif

L'instrument de mesure produit des valeurs exactes sur des fichiers dont on connaît la
vérité, et refuse de produire une valeur quand il ne peut pas la mesurer.

## Périmètre

**Dans :**
- La justesse de toutes les grandeurs produites, vérifiée contre des fichiers de vérité connue
- Un critère d'écrêtage qui détecte réellement l'écrêtage
- La suppression de toute valeur de seuil dans le code
- Le comportement sur les entrées dégradées : silence, mono, durée trop courte, absence
  d'outil
- Des fichiers d'épreuve reproductibles

**Hors :**
- L'étalonnage des seuils eux-mêmes sur des œuvres commerciales — c'est T0102, et cette tâche
  en est le préalable : étalonner avec un instrument faux propagerait l'erreur dans la charte
- La mesure de l'équilibre entre stems, qui relève du skill `audio-qa` et non du script
- Toute nouvelle grandeur mesurée : on fiabilise l'existant, on ne l'étend pas

## Comportement attendu

### Cas nominal

Le script reçoit un fichier audio et un chemin de charte. Il produit sur sa sortie standard un
document JSON contenant, pour chaque grandeur, soit une valeur numérique exacte, soit `null`
accompagné d'une raison. Chaque critère de la charte reçoit un verdict parmi trois :
conforme, hors charte, ou non mesurable.

Aucun seuil numérique n'apparaît dans le code source : la charte est la seule origine des
valeurs de référence.

### Cas limites

| Entrée | Comportement attendu |
|---|---|
| Fichier entièrement silencieux | Le niveau intégré, la plage de loudness et la marge de sursaut sont `null` avec la raison « signal silencieux ». Aucun nombre inventé, aucun `-Infinity` propagé en JSON. |
| Fichier plus court que la fenêtre de mesure du niveau intégré | Les grandeurs qui exigent cette fenêtre sont `null` avec la raison « durée insuffisante ». Les autres restent mesurées. |
| Fichier mono | Toutes les grandeurs sont mesurées. Le nombre de canaux est reporté. |
| Fichier sans aucun silence détecté | Les statistiques de blancs sont `null`, **pas zéro** : l'absence de mesure et une mesure nulle sont deux informations différentes. |
| Fichier ne contenant que du silence en tête et en queue | Les blancs internes sont `null` ; les silences de tête et de queue sont mesurés. |
| Charte incomplète : une clé attendue manque | Échec explicite nommant la clé manquante. |
| Charte contenant une clé inconnue | Échec explicite nommant la clé inattendue — c'est le symptôme d'un renommage, et le taire réintroduit le défaut d'aujourd'hui. |

### Cas d'erreur

| Situation | Comportement | Échec ou repli ? | Journalisation |
|---|---|---|---|
| `ffmpeg` ou `ffprobe` absent | Arrêt avant toute mesure, message nommant l'outil manquant | **échec** | message sur la sortie d'erreur |
| Fichier introuvable ou illisible | Arrêt, message nommant le chemin | **échec** | idem |
| Fichier présent mais non décodable | Arrêt, message reprenant l'erreur de l'outil | **échec** | idem |
| Charte absente ou JSON invalide | Arrêt, message nommant le chemin et l'erreur | **échec** | idem |
| Une sortie d'outil ne correspond à aucun motif attendu | La grandeur vaut `null` avec la raison « sortie non reconnue », et le fragment non reconnu est reporté | **repli, jamais silencieux** | dans la sortie JSON |
| Le processus de mesure sort en erreur | Arrêt, message reprenant la sortie d'erreur | **échec** | sur la sortie d'erreur |

Aucun repli ne substitue une valeur par défaut à une mesure ratée. Une mesure absente est
`null` avec sa raison ; c'est la seule forme admise (`CONVENTIONS.md` §5).

## Contrats

### Sortie du script

Document JSON sur la sortie standard. Toute grandeur est soit un nombre, soit un objet
`{ "valeur": null, "raison": "<texte>" }`. Les sections obligatoires :

- `fichier` — chemin analysé
- `format` — durée en secondes, codec, fréquence d'échantillonnage, nombre de canaux, débit
- `loudness` — niveau intégré, plage de loudness, crête réelle, niveau court terme maximal,
  marge de sursaut
- `dynamique` — écrêtage, offset continu, et les grandeurs de forme du signal conservées
- `blancs` — nombre de blancs internes, durée totale, part de la durée, médiane, 90ᵉ centile,
  maximum, silence de tête, silence de queue
- `verdicts` — un élément par critère de la charte : `{ critere, valeur, attendu, statut }`,
  `statut` valant `conforme`, `hors-charte` ou `non-mesurable`
- `charte` — chemin et empreinte du fichier de charte utilisé, pour qu'une fiche d'écoute
  puisse dire contre quelle version elle a été jugée
- `analyseLe` — horodatage

### Interface en ligne de commande

Le chemin de la charte est **obligatoire**. L'appel sans charte échoue avec un message
explicite, plutôt que de retomber sur des valeurs internes.

### Code de sortie

`0` si l'analyse a abouti, quel que soit le verdict des critères. Non nul si l'analyse n'a pas
pu être menée. Le verdict n'est pas une erreur d'exécution : un mix hors charte est une
information, pas une panne.

### Fichiers d'épreuve

Reproductibles par une commande du dépôt, sans accès réseau. **Aucun fichier audio binaire
n'est versionné** : le dépôt reste lisible et léger, et les épreuves restent inspectables.

## Critères d'acceptation

1. Sur un fichier de vérité connue construit pour l'épreuve, chaque grandeur produite est
   exacte à la tolérance près déclarée dans les tests, vérifiée contre la sortie brute des
   outils lue à la main.
2. Le critère d'écrêtage vaut « conforme » sur un fichier volontairement non écrêté, et
   « hors charte » sur un fichier volontairement écrêté. Les deux fichiers sont produits par
   la même commande reproductible.
3. Aucune des valeurs de référence de la charte — bornes, plafonds, seuil de détection du
   silence — n'apparaît dans le code source du script. Les constantes propres au traitement
   (conversions d'unité, indices, motifs) restent évidemment permises : le critère porte sur
   les valeurs dont la charte est l'autorité, pas sur tout nombre.
4. L'appel sans chemin de charte échoue avec un message nommant l'option manquante.
5. Une charte à laquelle il manque une clé attendue, ou qui en contient une inattendue,
   provoque un échec nommant la clé.
6. Sur un fichier entièrement silencieux, le script aboutit et les grandeurs de loudness sont
   `null` avec la raison « signal silencieux ». Aucune valeur infinie n'apparaît dans le JSON.
7. Sur un fichier plus court que la fenêtre du niveau intégré, le script aboutit et distingue
   les grandeurs mesurables des autres.
8. Sur un fichier mono, toutes les grandeurs sont mesurées et le nombre de canaux est reporté.
9. En l'absence de `ffmpeg` ou `ffprobe`, le script s'arrête avant toute mesure avec un
   message nommant l'outil, et un code de sortie non nul.
10. Le JSON produit contient le chemin et l'empreinte de la charte utilisée.
11. Un fichier sans aucun silence détecté produit des statistiques de blancs à `null` et non
    à zéro.

## Stratégie de vérification

| Critère | Moyen de vérification |
|---|---|
| 1 | Test d'intégration sur les fichiers d'épreuve, valeurs attendues fixées après lecture manuelle de la sortie brute des outils |
| 2 | Test d'intégration sur la paire de fichiers écrêté / non écrêté |
| 3 | Lecture du fichier source, en confrontant chaque littéral numérique restant aux clés de la charte |
| 4, 5 | Tests sur le code de sortie et le message |
| 6, 7, 8, 11 | Tests d'intégration sur les fichiers d'épreuve dégradés |
| 9 | Test avec un chemin d'outil rendu introuvable |
| 10 | Test sur la structure du JSON |

Tous les tests exigent `ffmpeg` : ils doivent être ignorés explicitement, avec un message, sur
une machine qui ne l'a pas — jamais réussir en silence.

## Impacts

- **Bloque T0102** : étalonner la charte avec un instrument faux propagerait l'erreur dans les
  seuils, donc dans tous les critères de sortie des epics audio.
- **Change l'interface** : la charte devient obligatoire. Tout appel existant du script est à
  reprendre. À la date de cette spec, le script n'est appelé par aucun autre code.
- **Code supprimé** : la table de seuils recopiée (`analyse-audio.ts:29-47`) et la fusion
  permissive avec la charte (`:233`).
- **Aucun impact sur le pipeline de production** : le script est un outil de diagnostic.

## Risques et questions ouvertes

**Le critère d'écrêtage peut ne pas avoir de mesure évidente.** Détecter un écrêtage réel
plutôt qu'une simple atteinte du maximum demande de choisir une définition — suites
d'échantillons à pleine échelle, dépassement de la crête réelle, ou platitude du signal. La
spec impose le comportement observable (conforme sur un fichier propre, hors charte sur un
fichier écrêté) et laisse la définition à l'implémentation. Si aucune définition ne satisfait
les deux cas d'épreuve, c'est un retour vers cette spec, pas une décision à prendre pendant
l'implémentation.

**La crête réelle est peut-être déjà mal lue.** `analyse-audio.ts:94` cherche `Peak:` dans le
résumé d'`ebur128`, ce qui suppose que l'option de crête réelle est active et que le motif ne
capture pas une autre ligne. Le critère 1 le tranchera.

**La tolérance des tests reste à fixer.** Les mesures de loudness ne sont pas exactement
reproductibles entre versions d'outil. La tolérance doit être assez large pour ne pas casser
au moindre changement de version, assez étroite pour attraper une régression de parsing.
**Question ouverte, à trancher à l'implémentation, en mesurant la dispersion réelle.**

**Une charte stricte peut gêner.** Refuser une clé inattendue empêche d'ajouter un seuil
expérimental sans toucher au script. C'est délibéré : le silence sur les clés inconnues est
exactement le défaut corrigé ici.

---
*Cette spécification décrit un résultat attendu, pas une implémentation. Le plan
d'implémentation sera produit séparément par `implementation-planner` au moment de coder.*
