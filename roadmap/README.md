# Roadmap Mio

*Index régénéré le 5 septembre 2026 par `roadmap-keeper`. Ne pas éditer à la main.*

Méthode : `CONVENTIONS.md` · Produit et charte sonore : `PRODUIT.md` ·
Ancienne planification : `archive/TRI-EXISTANT.md`

---

## Où on en est

Aucun epic commencé. 12 epics, 49 tâches pressenties, 0 spécifiée.

| Epic | Titre | Statut | Tâches | Objectif mesurable |
|------|-------|--------|--------|--------------------|
| E01 | Banc d'essai audio | a-faire | 0/6 | Générer, mesurer et comparer une scène en moins d'une heure, hors workflow |
| E02 | Le script parle | a-faire | 0/6 | Blancs conformes à la charte, voix distinctes et stables |
| E03 | Lit sonore | a-faire | 0/4 | Une ambiance à la fois, musique continue sans couture |
| E04 | Mixage et masterisation | a-faire | 0/5 | Dix histoires conformes à la charte sans intervention |
| E05 | Texte qui tient debout | a-faire | 0/5 | 8 scripts sur 10 tiennent la grille d'évaluation |
| E06 | Garde-fous enfant | a-faire | 0/5 | Aucun contenu inapproprié n'atteint la synthèse sur le jeu adverse |
| E07 | Backoffice de pilotage | a-faire | 0/6 | Cycle complet générer / écouter / comparer / annoter sans terminal |
| E08 | Propriété et accès | a-faire | 0/6 | Deux familles isolées, prouvé par test |
| E09 | Frontières et code mort | a-faire | 0/6 | Aucun package n'importe une app, aucun export injoignable |
| E10 | Application parent | a-faire | — | Trois parents extérieurs écoutent sans assistance |
| E11 | L'enfant aux commandes | a-faire | — | Un enfant de 6 ans fabrique son histoire seul |
| E12 | L'univers comme donnée | a-faire | — | Un univers ajouté sans déploiement, reconnaissable à l'écoute |

E10 à E12 sont volontairement peu découpés : ils seront précisés quand les précédents seront
livrés.

## Ordre proposé

```
  S01 ─► E01 ─► E02 ─► E03 ─► E04 ─┬─► E05 ─► E06 ─► E10 ─► E11 ─► E12
 spike   banc   voix   stems   mix  ├─► E07 (backoffice)          ▲
                                    └─► E09 (frontières)          │
                          E08 (propriété, indépendant) ───────────┘
```

**Critère d'ordonnancement :** délai avant de pouvoir écouter le résultat, avant toute
dépendance technique (`PRODUIT.md` §6). E01 vient en premier non parce qu'il améliore le
rendu — il n'en change pas une note — mais parce qu'il rend tous les suivants moins chers.

**E08 est indépendant** et peut être mené en parallèle à tout moment. Il devient bloquant dès
qu'une personne extérieure doit écouter.

## Sur quoi on peut travailler maintenant

| Prochaine action | Objet | Pourquoi maintenant |
|------------------|-------|---------------------|
| Lancer `spike-runner` | **S01** — synthèse multi-voix, musique, mixage 3 stems | Décide l'architecture de E02 à E04. Rien de lourd ne doit démarrer avant son verdict. |
| Lancer `task-specifier` | **T0101** — fiabiliser la mesure | Indépendant du spike, débloque le jugement de tout le reste. |
| Lancer `task-specifier` | **T0102** — étalonner la charte | Nécessite des références commerciales fournies de l'extérieur du dépôt. |
| Lancer `task-specifier` | **T0801** — modèle de propriété | E08 n'a aucune dépendance ; utile si besoin de changer de sujet. |

## Bloqué

Rien n'est bloqué : aucun epic n'est commencé.

## Décisions en attente

| Décision | Bloque | Qui tranche |
|----------|--------|-------------|
| **ADR-0001** — qui porte le temps dans le pipeline audio | E02, E03, E04 | Découle du verdict de S01 |
| Références commerciales pour étalonner la charte | T0102, donc la validité de toutes les mesures | Produit |
| Sort des histoires déjà générées à la suppression du moteur de timeline | T0405 | Produit |
| Curseur entre protection et richesse narrative | E06 | Produit, à écrire dans `PRODUIT.md` |
| Modèle d'authentification | E08 | Produit, par ADR |
| Recrutement des trois premiers parents extérieurs | E10 | Produit |

## Incohérences détectées

| Constat | Nature | Action |
|---------|--------|--------|
| E02, E03, E04 référencent `ADR-0001` qui n'existe pas | attendu | L'ADR naîtra du verdict de S01. À créer avant de spécifier T0201. |
| E02 emploie « naturellement » sans mesure | acceptable | Dans la section narrative, pas dans un critère de sortie. Le critère 1 renvoie à `charte.json`. |
| E02 emploie « propre » | faux positif | « sa voix propre », possessif, pas l'adjectif d'appréciation. Le contrôle sera affiné. |

## Repères

- Décisions : `decisions/` — 0 ADR, 1 attendu (ADR-0001)
- Veille : `research/` — 0 note. Les constats ElevenLabs de cette session sont à formaliser
  par `tech-scout` avant de servir de base à une spec.
- Spikes : `spikes/` — 0, 1 à lancer (S01)
- Écoutes : `audio/` — charte v0.1.0 non étalonnée, 0 référence, 0 fiche
