---
sujet: elevenlabs-refonte-audio
date: 2026-09-05
revision: 2
question: "L'architecture ElevenLabs actuelle permet-elle de supprimer tout placement temporel côté Mio — voix, bruitages, musique ?"
statut_fraicheur: frais
concerne: [E02, E03, E04, S01]
---

# ElevenLabs — état au 5 septembre 2026

> **Révision 2.** La première rédaction reposait uniquement sur des résultats de recherche, le
> domaine du fournisseur étant bloqué par le proxy. Cette révision s'appuie sur les
> **définitions de types du SDK officiel `@elevenlabs/elevenlabs-js@2.66.0`** (publié le
> 2 septembre 2026), générées depuis la spécification OpenAPI de l'éditeur, complétées par le
> dépôt public de compétences officiel et un miroir vérbatim de la documentation dont la
> fidélité a été contrôlée. Quatre faits de la révision 1 étaient **faux** ; ils sont corrigés
> et signalés ci-dessous.

## Question

La refonte audio repose sur un pari : déléguer la synchronisation au fournisseur et supprimer
le moteur de timeline de Mio. Trois capacités doivent tenir — synthèse multi-voix en une
passe, bruitages portés par le script, musique à la longueur voulue.

## Réponse courte

**Oui pour la voix, oui pour la musique, non pour les bruitages.**

La synthèse multi-voix existe, le modèle n'est plus en préversion, et l'endpoint horodaté
renvoie **bien plus que prévu** : un découpage réplique par réplique issu de l'audio
réellement produit. La musique couvre 10 minutes. Mais l'éditeur lui-même déconseille les
tags de bruitage dans son propre outil de production, ce qui condamne pratiquement l'approche
retenue pour E03.

**Et un blocage préalable :** le SDK épinglé par le dépôt est déprécié et **ne contient ni la
synthèse de dialogue ni la génération musicale**. Rien de la refonte n'était réalisable
dessus.

## Constats

Niveaux de certitude : **vérifié** = lu dans les types du SDK officiel ou la documentation de
l'éditeur · **rapporté** = source tierce · **non vérifié** = n'a pu être établi.

| Fait | Certitude | Source |
|---|---|---|
| SDK `elevenlabs@1.59.0` **déprécié**, déplacé vers `@elevenlabs/elevenlabs-js` ; figé au 15 mai 2025 | vérifié | registre npm |
| L'ancien SDK n'expose **ni `textToDialogue` ni `music`** | vérifié | comparaison des ressources des deux paquets installés |
| Dialogue multi-voix : `eleven_v3` jusqu'à 10 voix ; `eleven_v3_conversational` une seule | vérifié | types SDK |
| Limite : **2 000 caractères** recommandés, tous tours confondus ; au-delà, coupure en flux ou erreur de validation | vérifié | types SDK, commentaire littéral |
| Maximum **10 voix distinctes** par requête | vérifié | types SDK |
| Endpoint dialogue **avec horodatages** : `convertWithTimestamps` | vérifié | types SDK |
| La réponse contient `alignment` **au caractère**, `normalizedAlignment`, et **`voiceSegments[]`** | vérifié | types SDK |
| `VoiceSegment` = `voiceId`, `startTimeSeconds`, `endTimeSeconds`, `characterStartIndex`, `characterEndIndex`, **`dialogueInputIndex`** (le tour d'origine) | vérifié | types SDK |
| Graine : entier **0 à 4 294 967 295, bornes incluses** ; déterminisme au mieux, non garanti | vérifié | types SDK |
| Tags audio = **instructions en langage naturel**, pas une énumération fermée | vérifié | doc éditeur, citation littérale |
| Tags **expérimentaux, dépendants de la voix, à tester avant production** — position officielle de l'éditeur | vérifié | doc éditeur |
| Le prompt de production de l'éditeur pour son propre outil ordonne : **ne pas utiliser de tags pour autre chose que la voix, ni musique ni effets sonores** | vérifié | doc éditeur |
| Musique : **3 s à 600 s**, en mode consigne **comme** avec plan de composition | vérifié | types SDK |
| Plan de composition : 30 sections maximum, 3 s à 120 s chacune | vérifié | dépôt officiel |
| `forceInstrumental` **garantit** l'instrumental ; réservé au mode consigne | vérifié | types SDK |
| Graine musicale **incompatible avec le mode consigne** : uniquement avec plan de composition | vérifié | types SDK |
| Modèles musique : `music_v1`, `music_v2` | vérifié | types SDK |
| Effets sonores : **`loop`** (boucle sans couture), `durationSeconds` 0,5 à 30 s, modèle `eleven_text_to_sound_v2` | vérifié | types SDK |
| **La couture entre requêtes n'existe pas sur `eleven_v3`** | vérifié | doc éditeur |
| Le mode sans rétention est **réservé aux comptes entreprise** | vérifié | types SDK, commentaire littéral |
| Musique réservée aux offres payantes | vérifié | doc éditeur |
| Voix d'enfants ou imitant des enfants **interdites au catalogue** | vérifié | doc éditeur |
| Par défaut, l'éditeur **entraîne ses modèles sur les données** des comptes non-entreprise ; un refus explicite est possible dans le profil | vérifié | doc éditeur |
| Données hébergées **aux États-Unis** par défaut ; résidence européenne réservée aux comptes entreprise | vérifié | doc éditeur |
| MP3 192 kbit/s exige le palier Creator ; **PCM et WAV 44,1 kHz exigent le palier Pro** | vérifié | doc éditeur |
| v3 n'est plus en préversion | vérifié | doc éditeur, aucune mention de préversion |
| Date exacte du passage en disponibilité générale (2 février 2026 ?) | rapporté | extrait de recherche tiers |
| Tarifs en devise | non vérifié | pages de tarification bloquées |

### Faits corrigés depuis la révision 1

| Affirmation de la révision 1 | Réalité |
|---|---|
| « Graine, 0 exclu » | Bornes **incluses**, 0 accepté |
| « Plan de composition : 3 s à 300 s » | **3 s à 600 s**, comme le mode consigne |
| « Droits commerciaux sauf cinéma, télévision et gros jeux » | La documentation inclut explicitement cinéma, télévision, publicité et jeu. Le détail par palier reste non établi |
| « Arbitrage journalisation / rétention à trancher par ADR » | **L'arbitrage n'existe pas** : la couture n'est pas disponible sur v3, et le mode sans rétention est réservé aux comptes entreprise |

## Limites et contraintes

**Découpage, sans filet.** La limite de 2 000 caractères impose deux à trois requêtes pour
une histoire de cinq minutes. Il n'existe **aucun mécanisme fournisseur** de continuité entre
requêtes sur v3. Le raccord entre blocs est donc entièrement à la charge de Mio, et c'est un
risque de qualité à mesurer, pas un détail d'implémentation.

**Concurrence.** Limites par palier — 2 en gratuit, 3 en Starter, 5 en Creator, 10 en Pro,
15 au-delà ; musique à 0 / 2 / 2 / 2 / 5. Des en-têtes exposent la concurrence courante et
maximale, et un code d'erreur distingue le dépassement de débit du dépassement de
concurrence. Impossible de consommer plus du double de son quota mensuel d'un coup.

**Formats et palier.** Une chaîne de masterisation qui veut travailler en non compressé
impose le palier Pro. C'est un arbitrage budgétaire, pas technique.

**Reproductibilité musicale en trompe-l'œil.** La graine n'est disponible qu'avec un plan de
composition. Régénérer deux fois la même musique depuis une simple consigne n'est pas
reproductible.

## Ce que ça ne fait pas

- **Aucun mixage voix + musique.** Les stems arrivent séparés ; l'assemblage, l'équilibre,
  l'atténuation sous la voix et la masterisation restent à Mio. Il existe en revanche un
  endpoint de séparation de stems, et la musique v2 revendique des effets intégrés.
- **Aucune continuité entre requêtes sur v3.**
- **Aucune garantie sur les tags**, et un déconseil explicite de l'éditeur pour les bruitages.
- **Aucune voix d'enfant au catalogue** — interdiction de politique, pas limite technique.

## Ce que ça implique pour Mio

**Un préalable bloquant.** Migrer vers `@elevenlabs/elevenlabs-js`. Ce n'est pas une tâche de
confort : sans elle, ni E02 ni E03 ni E04 ne peuvent commencer. Le nouveau SDK est installé à
côté de l'ancien ; les appels existants restent à migrer.

**Ce qui sort renforcé.** `voiceSegments[]` est un cadeau : pour chaque tour du script, la
voix, les bornes en secondes et l'index du tour d'origine — un découpage par réplique **issu
de l'audio réellement produit**. C'est le principe « l'audio fait foi » offert par l'API. Il
rend le repli de E03 non seulement possible mais propre : une piste de bruitages placée par
Mio sur des bornes mesurées, sans aucune dérive.

**Ce qui est condamné.** L'approche « bruitages portés par le script » de E03. Ce n'est plus
un doute issu de retours d'usage : l'éditeur documente la capacité tout en l'interdisant dans
son propre outil de production. Le critère de sortie n° 4 de E03 doit être réécrit autour du
repli, et le spike doit mesurer un taux de déclenchement pour savoir si les tags gardent un
usage marginal.

**Ce qui bouge côté ambiance.** Le paramètre de boucle sur les effets sonores fournit une
boucle sans couture jusqu'à 30 secondes. Une partie du travail d'ambiance prévu dans E03
devient inutile.

**Les vraies décisions de données**, à trancher par ADR — et ce ne sont pas celles annoncées :
refuser ou non l'entraînement sur les données ; accepter ou non l'hébergement aux États-Unis
pour un produit destiné à des enfants ; monter ou non au palier Pro pour du non compressé.

## Non vérifié

- **Les tarifs en devise.** Les pages de tarification sont bloquées ; la documentation n'en
  contient aucun montant.
- **La politique d'usage interdit.** Toute la documentation y renvoie sans la reproduire, et
  la page est bloquée. C'est le point le plus gênant pour un produit destiné aux enfants.
- **La date exacte de passage en disponibilité générale.**
- **Le taux de déclenchement des tags de bruitage, et leur comportement en français.** Aucune
  source. Reste l'objectif n° 1 de S01.
- **Les tailles maximales de requête et de réponse**, non chiffrées dans la documentation.

**Contrainte d'environnement à connaître :** `api.elevenlabs.io` est bloqué par le proxy au
même titre que le site. **Aucun appel réel n'est possible depuis l'environnement de travail,
même avec une clé.** S01 doit être exécuté ailleurs.

## Sources

- `@elevenlabs/elevenlabs-js@2.66.0`, définitions de types — installé localement, source de
  premier ordre générée depuis la spécification OpenAPI de l'éditeur
- Dépôt public de compétences officiel de l'éditeur, via `raw.githubusercontent.com`
- Miroir verbatim de la documentation officielle, fidélité contrôlée par recoupement avec les
  types du SDK
- Registre npm, pour le statut de dépréciation et les dates de publication
- Extraits de recherche tiers, pour la seule date de passage en disponibilité générale
