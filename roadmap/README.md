# Roadmap Mio

*Index régénéré le 5 septembre 2026 par `roadmap-keeper`, après vérification indépendante des
affirmations de l'audit et de la veille. Ne pas éditer à la main.*

Méthode : `CONVENTIONS.md` · Produit et charte sonore : `PRODUIT.md` ·
Ancienne planification : `archive/TRI-EXISTANT.md`

---

## Où on en est

Aucun epic commencé. 12 epics, 49 tâches pressenties, 0 spécifiée.

| Epic | Titre | Statut | Tâches | Objectif mesurable |
|------|-------|--------|--------|--------------------|
| E01 | Banc d'essai audio | a-faire | 0/6 (1 spécifiée) | Générer, mesurer et comparer une scène en moins d'une heure, hors workflow |
| E02 | Le script parle | a-faire | 0/7 | Blancs conformes à la charte, voix distinctes et stables |
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
| **Exécuter S01** | `spikes/S01-synthese-dialogue-et-stems/` — protocole écrit, critère de décision figé | Décide l'architecture de E02 à E04. Prêt à lancer : demande `ffmpeg`, une clé d'API sur offre payante, et le stem voix d'une histoire existante. |
| **Implémenter T0101** | `epics/E01-banc-essai-audio/T0101-fiabiliser-la-mesure/SPEC.md` | **Spécifiée.** Prochaine étape : `implementation-planner`. Bloque T0102 : étalonner avec un instrument faux propagerait l'erreur dans la charte. |
| Lancer `task-specifier` | **T0102** — étalonner la charte | Nécessite des références commerciales fournies de l'extérieur du dépôt. |
| Lancer `task-specifier` | **T0801** — modèle de propriété | E08 n'a aucune dépendance ; utile si besoin de changer de sujet. |

## Bloqué

Rien n'est bloqué : aucun epic n'est commencé.

## Décisions en attente

| Décision | Bloque | Qui tranche |
|----------|--------|-------------|
| ~~ADR-0001~~ | — | **Accepté.** L'axe A de S01 reste son test : un rejet le rendrait obsolète |
| Refuser ou non l'entraînement du fournisseur sur les données envoyées | E02, E06 | Produit, par ADR |
| Accepter ou non l'hébergement des données hors Union européenne | E02, E08 | Produit, par ADR |
| Supprimer `fluent-ffmpeg`, déprécié et non maintenu, au profit d'un appel direct | E04 | Technique, à T0401 |
| Les scripts sont-ils une application ou un package ? | E09 | Technique, par ADR |
| Références commerciales pour étalonner la charte | T0102, donc la validité de toutes les mesures | Produit |
| Sort des histoires déjà générées à la suppression du moteur de timeline | T0405 | Produit |
| Curseur entre protection et richesse narrative | E06 | Produit, à écrire dans `PRODUIT.md` |
| Modèle d'authentification | E08 | Produit, par ADR |
| Recrutement des trois premiers parents extérieurs | E10 | Produit |

## Incohérences détectées

Deux vérifications indépendantes ont été passées sur ce corpus : les affirmations sur le code
et les faits de veille. **85 affirmations contrôlées : 69 confirmées, 12 imprécises, 2 fausses,
2 non vérifiables.** Toutes les erreurs relevées ont été corrigées dans les documents ; ce
tableau ne garde que ce qui reste ouvert.

| Constat | Nature | Action |
|---------|--------|--------|
| ~~`ADR-0001` référencé mais absent~~ | résolu | Rédigé en statut `propose`. |
| E03 critère 4 : l'éditeur déconseille les tags de bruitage dans son propre outil de production | à traiter | Le repli est identifié et propre (placement sur `voiceSegments[]`, bornes issues de l'audio réel). S01 mesure s'il reste un usage marginal aux tags. |
| `analyse-audio.ts` : le critère d'écrêtage est inopérant et les seuils de la charte y sont recopiés | à traiter | T0101, avant tout étalonnage. Le second point viole la règle de source unique. |
| La cible de masterisation du code (−16 LUFS) contredit la charte (−19 à −17) | à traiter | T0404. Tant qu'elle tient, le critère 1 de E04 est inatteignable. |
| Une étape du workflow ne produit jamais rien | à traiter | T0304. |
| `packages/scripts` importe l'application serveur à l'exécution dans 17 fichiers | à traiter | E09. T0901 ne le règle pas : c'est une décision d'architecture à part. |
| `elevenlabs@1.59.0` déprécié, sans dialogue ni musique | **bloquant** | T0200, préalable à E02, E03 et E04. Le paquet courant est installé à côté ; les appels restent à migrer. |
| `fluent-ffmpeg` déprécié et figé, non actualisable | à trancher | E04, question ouverte. |
| E02 emploie « naturellement » sans mesure | acceptable | Section narrative, pas un critère. |

## Repères

- Décisions : `decisions/` — 1 ADR (`ADR-0001`, **accepté**), 3 attendus : refus de
  l'entraînement sur les données, modèle de propriété des données, frontière moteur / univers
- Veille : `research/` — 1 note (`2026-09-05-elevenlabs-refonte-audio`, révision 2), fraîche.
  La plupart des faits sont désormais *vérifiés* sur les types du SDK officiel. Restent non
  vérifiés : les tarifs, la politique d'usage interdit, et le comportement réel des tags.
- Spikes : `spikes/` — 1 (S01, protocole écrit, en attente d'exécution)
- Écoutes : `audio/` — charte v0.1.0 non étalonnée, 0 référence, 0 fiche
