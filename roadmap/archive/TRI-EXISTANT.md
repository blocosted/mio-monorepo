# Tri de l'existant — roadmap.md et backlog.md

*5 septembre 2026. Les 63 US de l'ancienne planification (janvier 2026), passées au crible de
l'audit d'architecture et de la décision de refonte audio. Ce document justifie ce qui est
embarqué dans la nouvelle roadmap et ce qui ne l'est pas.*

**Décisions :** `garder` (acquis ou intention encore juste) · `reformuler` (intention valide,
contenu à réécrire) · `reporter` (juste, mais pas maintenant) · `jeter` (caduc).

Bilan sur 63 US : **27 gardées · 16 reformulées · 13 reportées · 7 jetées**, et **9 chantiers
absents** de l'ancienne planification.

---

## Infrastructure

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 001 | Monorepo Nx ✅ | reformuler | Acquis, mais l'audit révèle un cycle `shared → api`, l'absence de `package.json` dans les packages (donc `enforce-module-boundaries` inopérant) et aucun garde `server-only`. À reprendre comme dette. |
| 002 | Base Supabase ✅ | garder | Acquis. |
| 003 | Supabase Storage ✅ | reformuler | Le bucket audio est **public** en lecture anonyme. À reprendre en privé + URL signées. |
| 004 | Redis ✅ | garder | Acquis. |
| 005 | Upstash Workflow ✅ | reformuler | La signature QStash n'est jamais vérifiée alors que la clé est déclarée. Et le workflow passe de 9 étapes à ~4 avec la refonte. |
| 006 | Docker Scaleway | garder | Toujours pertinent, toujours pas fait. |
| 007 | API Elysia ✅ | reformuler | Acquis, mais **aucune authentification** n'est montée. |
| 008 | Client Eden type-safe ✅ | reformuler | Fonctionne, mais c'est lui qui porte le cycle `shared → api` : le contrat HTTP vit dans le package du client, qui importe le type de l'app Elysia. À scinder en `@mio/contracts`. |
| 009 | Infrastructure de tests ✅ | garder | Bien faite, précieuse. Rien à changer. |

## Profils enfants

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 010 | Création profil (back) ✅ | reformuler | Fonctionne, mais sans propriétaire, et `favoriteThemes`/`avoidThemes` sont des tableaux de chaînes non bornés interpolés dans le prompt système. |
| 012 | Liste profils ✅ | garder | Acquis. |
| 014 | Détail et édition ✅ | garder | Acquis. |
| 011 / 013 / 015 | Pages profil (front) | reporter | Pas d'application parent avant que l'audio soit bon (`PRODUIT.md` §5). L'intention reste juste. |

## Création d'histoire

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 020 | Histoire depuis prompt initial ✅ | garder | Acquis. |
| 022 | Enrichissement LLM ✅ | reformuler | Aucune consigne de sécurité dans le prompt système ; l'univers est une chaîne libre ; les 8 ambiances sont codées en dur à trois endroits avec repli silencieux sur `forest`. |
| 023 | Endpoint enrichissement ✅ | garder | Acquis. Le corps de requête accepte un champ `duration` jamais lu — détail à nettoyer. |
| 021 | Page input initial (front) | reporter | Idem pages profil. |
| 024 | Page d'enrichissement (front) | **jeter** | L'enrichissement est une étape interne du pipeline, pas un écran. En faire une page expose une mécanique que l'utilisateur n'a pas à voir. |

## Questions guidées — le pari produit

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 030 | Génération des questions guidées | garder | **Jamais implémenté.** C'est le pari produit d'origine et il n'existe nulle part dans le code. Le type `StoryQuestion` est déclaré et référencé zéro fois. |
| 032 | Sauvegarde des réponses | garder | Jamais implémenté non plus : `POST /stories/:id/generate` valide `answers` puis les jette. La colonne est toujours `NULL`. |
| 031 | Page questions guidées (front) | reporter | Après l'audio. |

## Génération de script

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 040 | Service de génération de script ✅ | reformuler | Le plus gros chantier. Le format `timingHint` disparaît avec la délégation du timing ; l'émotion des dialogues est un champ libre non validé ; `parseScriptResponse` fait un simple `as` sans validation d'exécution ; la piste ambiance n'est jamais demandée au LLM. |
| 041 | Endpoint de lancement ✅ | garder | Acquis. |
| 042 | Step workflow script ✅ | reformuler | Le workflow est restructuré. |

## Audio — cœur de la refonte

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 050 | TTS ElevenLabs ✅ | reformuler | Passage de la synthèse segment par segment à Text to Dialogue : c'est ce qui règle d'un coup les blancs inter-répliques et la prosodie plate. Le code paie déjà `eleven_v3` sans en tirer les bénéfices. |
| 051 | Service SFX ✅ | **jeter** (partiel) | Les tags SFX inline suppriment l'étape de placement. La bibliothèque et le store restent utiles pour l'ambiance. |
| 052 | Génération musicale 🚧 | **jeter** | La musique est fabriquée en bouclant un clip ≤ 22 s issu de l'**API d'effets sonores**, avec une soudure franche sans fondu. À refaire sur l'API Music. |
| 053 | Step voix ✅ | reformuler | Absorbé par la génération en une passe. |
| 054 | Step SFX ✅ | **jeter** | Absorbé par la piste voix. |
| 055 | Step musique ✅ | reformuler | Un stem pleine longueur au lieu d'une boucle. |
| 056 | Ambiance ✅ | reformuler | Un stem pleine longueur, exclusif, au lieu de N segments empilés qui jouent tous simultanément jusqu'à la fin. |
| 060 | FFmpeg Mixer ✅ | reformuler | De 880 lignes de moteur de timeline à ~150 lignes de mixage de stems. FFmpeg reste, sa mission change. |
| 061 | Timeline vocale ✅ | **jeter** | `TimelineComputationService` et la table `computed_timelines` disparaissent : le temps n'est plus prédit. |
| 062 | Step mixage ✅ | reformuler | Simplifié en conséquence. |
| 063 | Upload et finalisation ✅ | garder | Acquis. |

## Lecture et bibliothèque

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 070 | Récupération d'une histoire ✅ | garder | Acquis. |
| 072 | Bibliothèque par profil ✅ | garder | Acquis. |
| 074 | Suppression d'une histoire ✅ | garder | Acquis. |
| 071 / 073 | Player et page bibliothèque (front) | reporter | Après l'audio. Un lecteur existe déjà côté backoffice. |

## Suivi de progression

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 080 / 081 / 082 | Redis, polling, SSE ✅ | garder | Acquis et solides. |
| 083 / 084 | Hook et page (front) | reporter | Existent déjà côté backoffice. |

## Optimisation audio (phase 3.5)

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 100 | Schéma voix typé ✅ | garder | Bien fait. La colonne `labels` marquée *legacy, will be removed* est toujours là — à nettoyer. |
| 101 | Sync voix paginé ✅ | garder | Acquis. |
| 110 | Schéma bibliothèques audio ✅ | garder (partiel) | Pertinent pour l'ambiance. Les tables musique et SFX perdent leur usage. |
| 111 | Lookup sémantique ✅ | garder (partiel) | Idem. |
| 113 | Intégration hybride ambiance ✅ | garder | L'approche *library-first* garde tout son sens ici. |
| 112 | Intégration hybride SFX ✅ | **jeter** | Remplacé par les tags inline. |
| 114 | Intégration hybride musique ✅ | **jeter** | Remplacé par l'API Music. |
| 115 / 116 | CLI seed et stats ✅ | garder | Très utile pour l'outillage d'écoute. |

## Polish et sécurité (phase 4, 0 % faite)

| US | Titre | Décision | Motif |
|----|-------|----------|-------|
| 090 | Filtrage de contenu | garder, **priorité haute** | Écrite, jamais faite. C'est le seul garde-fou enfant planifié, et il n'existe pas. La double vérification du script généré est le point le plus important de cette US. |
| 091 | Validation des inputs | garder, **priorité haute** | Partiellement acquis (Typebox aux frontières HTTP), mais rien ne borne les tableaux ni ne valide les réponses du LLM à l'exécution. |
| 092 | Retry et fallbacks | reformuler | Le critère « fallback vers histoire template si le LLM échoue » contredit frontalement la règle *pas d'échec silencieux* (`CONVENTIONS.md` §5). Un enfant ne doit pas recevoir une histoire générique en croyant recevoir la sienne. |
| 085 / 086 / 087 / 088 | Zustand, erreurs, PWA, skeletons | reporter | Application parent, après l'audio. |

---

## Ce que l'ancienne planification ne contient pas du tout

Ces neuf chantiers n'ont **aucune US** dans `roadmap.md` ni `backlog.md`. C'est le résultat le
plus important de ce tri : les trous comptent plus que les redites.

| Chantier | Pourquoi c'est un trou grave |
|---|---|
| **Authentification et modèle de propriété** | Aucune table utilisateur, aucun propriétaire de profil enfant, aucun plugin d'auth sur l'API — et **aucune US** ne les prévoit. Bloquant absolu avant tout utilisateur externe. |
| **Vérification de signature QStash** | L'endpoint de workflow est ouvert : n'importe qui peut déclencher ou rejouer une génération, donc brûler du crédit LLM et TTS. |
| **Stockage privé** | Bucket public en lecture anonyme, URL déterministe. Combiné à l'API ouverte, l'audio des histoires est énumérable. |
| **Frontières de packages** | Cycle `shared → api`, aucun `package.json` dans les packages, aucun garde `server-only`. |
| **Charte sonore et outillage de mesure** | La qualité audio n'était mesurée par rien. C'est désormais couvert par `audio-qa` et `roadmap/audio/charte.json`. |
| **Entité univers** | Aucune entité monde / trame / personnage réutilisable. Sans elle, la place de marché est inatteignable. |
| **Chemin de détresse vers le parent** | Rien n'est prévu si un enfant exprime quelque chose d'inquiétant. |
| **RGPD, rétention, minimisation** | Aucune mention de consentement, de durée de conservation ni de suppression, pour un produit traitant des données de mineurs. |
| **Suppression de code mort** | Plus de 1 000 lignes de services soignés jamais appelés (matching de voix, batching TTS, stratégie musicale). Ce n'est pas une US, mais c'est un livrable de la refonte. |

---

## Ce qui reste utile dans les anciens documents

- Les **critères d'acceptation détaillés** des US d'infrastructure, réutilisables tels quels
  pour documenter l'acquis.
- L'**historique des mises à jour** de `backlog.md`, qui date précisément l'avancement de
  janvier 2026 et donne le rythme réel du projet.
- Les **notes de coût** : « ElevenLabs ≈ 0,40 $ par histoire, surveiller les coûts ». À
  revérifier — c'est un chiffre de janvier, et la tarification v3 a bougé.
- Les trois **décisions techniques marquées « à prendre »** et jamais tranchées : choix du
  fournisseur LLM, stratégie de voix (un appel par segment contre groupé), stockage des
  fichiers temporaires. La deuxième est précisément celle que la refonte tranche.

Les fichiers d'origine sont conservés à côté de ce document : `roadmap-legacy.md` et
`backlog-legacy.md`.
