# Conventions de travail — Mio

Ce document est la référence unique de la méthode. **Tous les skills du répertoire
`.claude/skills/` commencent par le lire.** S'il contredit un skill, c'est lui qui gagne :
corrige le skill, pas ce document.

Langue de rédaction : **français**. Les identifiants, les noms de fichiers, les slugs et le
vocabulaire technique restent en anglais (`spec`, `epic`, `spike`, `ADR`, `stem`, `LUFS`).

---

## 1. La chaîne de travail

```
    tech-scout ──┐
                 ├──► epic-designer ──► task-specifier ──► implementation-planner ──► code ──► task-reviewer
    spike-runner ┘         │                  │                                                    │
                           └────── adr-writer (décisions structurantes) ◄────────────────────────┘

    roadmap-keeper : maintient la cohérence de l'ensemble
    audio-qa       : mesure la qualité du produit, indépendamment des tâches
```

Chaque étape produit un artefact écrit et versionné. Rien ne se transmet oralement : si une
information n'est pas dans un fichier de `roadmap/`, elle n'existe pas.

---

## 2. La distinction spec / plan

C'est la règle la plus importante du projet.

| | **Spécification** (`SPEC.md`) | **Plan d'implémentation** (`PLAN.md`) |
|---|---|---|
| Répond à | *Quoi*, *pourquoi*, *comment le prouver* | *Où*, *dans quel ordre*, *avec quoi* |
| Durée de vie | Survit à une réécriture complète du code | Jetable après l'implémentation |
| Écrit par | `task-specifier` (avec exploration + veille) | `implementation-planner`, au moment d'implémenter |
| Contient | comportements, contrats, critères d'acceptation | fichiers, fonctions, étapes, ordre des tests |
| Ne contient pas | de chemins de fichiers, de noms de fonctions | de nouvelles décisions produit |

**Le test des trois implémentations.** Si trois développeurs compétents pouvaient
implémenter la spec de trois façons différentes et que les trois satisferaient tous les
critères d'acceptation, la spec est au bon niveau d'abstraction. Si une seule façon peut
passer, tu as écrit un plan déguisé.

**L'exception qui n'en est pas une : les contrats.** Un schéma d'API, une colonne de base de
données, une forme de JSON, un invariant — ce sont des comportements observables, pas des
choix d'implémentation. Ils ont leur place dans la spec.

---

## 3. Arborescence

```
roadmap/
├── CONVENTIONS.md              ← ce document
├── README.md                   ← index vivant, maintenu par roadmap-keeper
├── PRODUIT.md                  ← vision, personas, charte sonore (la barre de qualité)
├── epics/
│   └── E01-<slug>/
│       ├── EPIC.md
│       └── T0101-<slug>/
│           ├── SPEC.md         ← task-specifier
│           ├── PLAN.md         ← implementation-planner (au moment d'implémenter)
│           └── REVUE.md        ← task-reviewer (après implémentation)
├── decisions/
│   └── ADR-0001-<slug>.md      ← adr-writer
├── research/
│   └── 2026-09-05-<sujet>.md   ← tech-scout, daté du jour de la vérification
├── spikes/
│   └── S01-<slug>/
│       ├── SPIKE.md            ← protocole, écrit AVANT
│       └── VERDICT.md          ← résultat + décision, écrit APRÈS
├── audio/
│   ├── references/             ← mesures d'œuvres commerciales servant d'étalon
│   └── <story-id>/
│       └── 2026-09-05-fiche-ecoute.md
└── archive/                    ← ancien roadmap.md / backlog.md
```

### Nommage

- Epic : `E<NN>-<slug-kebab>` — ex. `E02-moteur-audio`
- Tâche : `T<NNNN>-<slug-kebab>` où les deux premiers chiffres reprennent l'epic — ex. `T0203-stem-musique`
- ADR : `ADR-<NNNN>-<slug-kebab>` — numérotation globale, jamais réutilisée
- Spike : `S<NN>-<slug-kebab>`
- Recherche : `<YYYY-MM-DD>-<slug-kebab>.md`

---

## 4. Front matter obligatoire

`roadmap-keeper` parse ces blocs. Un front matter invalide est une erreur, pas un détail.

**EPIC.md**
```yaml
---
id: E02
titre: Moteur audio
statut: en-cours          # a-faire | en-cours | livre | abandonne
depend_de: [E01]
adr: [ADR-0002]
objectif_mesurable: "Une histoire de 5 min passe la charte sonore sans intervention manuelle"
---
```

**SPEC.md**
```yaml
---
id: T0203
epic: E02
titre: Génération du stem musical en une passe
statut: a-faire           # a-faire | specifiee | planifiee | en-cours | en-revue | livree | abandonnee
type: refonte             # feature | fix | refonte | spike | chore | dette
depend_de: [T0201]
adr: [ADR-0002]
research: [2026-09-05-elevenlabs-music-api]
effort: M                 # S (< 1j) | M (1-3j) | L (3-8j) | XL (à découper)
---
```

**ADR-XXXX.md**
```yaml
---
id: ADR-0002
titre: Déléguer la synthèse voix+SFX à Text to Dialogue
statut: accepte           # propose | accepte | remplace-par-ADR-XXXX | obsolete
date: 2026-09-05
concerne: [E02]
---
```

---

## 5. Règles de fond

**Tout critère d'acceptation est falsifiable.** « L'audio est de bonne qualité » n'est pas un
critère. « Le LUFS intégré du mix final est entre −19 et −17, mesuré par
`audio-qa` » en est un. Si tu ne sais pas comment prouver qu'un critère est faux, il n'est
pas encore écrit.

**Pas d'adjectif sans nombre.** *fluide*, *naturel*, *propre*, *performant*, *amélioré* sont
interdits dans une spec sauf s'ils sont immédiatement suivis d'une mesure et d'un seuil.

**Les échecs silencieux sont interdits.** C'est une leçon directe de l'audit du code existant :
une ancre de timing introuvable qui renvoie `0`, une ambiance inconnue qui retombe sur
`forest`, une émotion non reconnue qui devient `neutral` — chacun de ces défauts était
invisible et chacun s'entendait. Toute spec qui introduit une valeur de repli doit dire
explicitement si le repli est *acceptable* (et alors il est journalisé au niveau `warn` avec
son contexte) ou *inacceptable* (et alors on échoue franchement).

**Rien de mort.** Tout service, tout module introduit par une tâche doit être atteignable
depuis un handler, un workflow ou un script. L'audit a trouvé plus de 1 000 lignes de code
soigné jamais appelé. Une tâche qui produit du code injoignable n'est pas terminée.

**Une seule source de vérité par donnée.** Deux tables de constantes qui se contredisent,
deux calculs du même temps, deux définitions du même volume : c'est un défaut, pas un détail.

**L'audio fait foi.** On ne prédit jamais une durée pour ensuite fabriquer de l'audio censé
lui correspondre. On fabrique l'audio, on le mesure, et la timeline se déduit de la mesure.

---

## 6. Cycle de vie d'une tâche

1. `task-specifier` écrit `SPEC.md` → statut `specifiee`
2. Toi, tu relis et tu valides (ou tu renvoies avec des questions)
3. `implementation-planner` écrit `PLAN.md` → statut `planifiee`
4. Implémentation → statut `en-cours`
5. `task-reviewer` écrit `REVUE.md` → statut `en-revue`
6. Tu valides → statut `livree`

Une spec n'est jamais modifiée pendant l'implémentation. Si l'implémentation révèle que la
spec est fausse, on **arrête**, on corrige la spec, et on repart de l'étape 2. C'est ce qui
empêche le périmètre de dériver en silence.

---

## 7. Ce qui déclenche un ADR

Écris un ADR quand une décision est **coûteuse à défaire** ou **non évidente pour qui
reprendra le sujet dans six mois** :

- un choix de fournisseur ou d'API externe
- une frontière d'architecture (qui a le droit d'appeler quoi)
- un modèle de données structurant
- l'abandon délibéré d'une approche qui semblait raisonnable
- un compromis assumé sur la qualité, le coût ou la sécurité

Une décision purement locale à une tâche n'a pas besoin d'ADR : elle vit dans la spec.
