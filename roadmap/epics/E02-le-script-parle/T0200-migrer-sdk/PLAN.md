# Plan — T0200 Migrer vers le SDK courant du fournisseur audio

Spec : `./SPEC.md` — relue le 5 septembre 2026
Contraintes lues : `CLAUDE.md` §Dependency Constraints

## Lecture de la spec

On remplace un paquet déprécié par son successeur, sans changer un seul comportement
observable. Quatre appels, deux fichiers. Le succès se prouve par comparaison avant / après
sur du contenu réel, pas par la compilation.

## Blocages

Aucun blocage de spécification.

**Mais une contrainte d'environnement décisive :** les critères 3, 4 et 5 — durées identiques,
alignement de même forme et mêmes unités, liste de voix identique — exigent un appel réel au
fournisseur. `api.elevenlabs.io` est bloqué par le proxy de l'environnement de travail. **La
moitié des critères ne peut donc pas être vérifiée ici, et la tâche ne pourra pas être
déclarée livrée depuis cet environnement.** La spec l'anticipait ; le plan en tire la
conséquence à l'étape 4.

## État des lieux

**Le changement réel n'est pas le nom des méthodes, c'est la casse.** L'ancien paquet expose
des champs en `snake_case`, le nouveau en `camelCase`, pour les paramètres de requête comme
pour les champs de réponse. Les quatre méthodes gardent leur nom ; tout le reste bouge.

| Appel | Fichier | Ce qui change |
|---|---|---|
| `textToSpeech.convertWithTimestamps` | `apps/api/src/repositories/audio/audio.repository.ts:149` | Requête : `model_id`, `output_format`, `voice_settings.similarity_boost`, `previous_text`, `next_text`. Réponse : `audio_base64` → `audioBase64` (`:159`), `alignment.character_end_times_seconds` → `characterEndTimesSeconds` (`:166,168`), et les deux champs symétriques (`:189-191`) |
| `voices.getAll` | `audio.repository.ts:248` | Réponse : `voice.voice_id` → `voiceId` (`:253`), `voice.preview_url` → `previewUrl` (`:256`) |
| `textToSoundEffects.convert` | `audio.repository.ts:314` | Requête : `output_format`, `duration_seconds`, `prompt_influence` → `camelCase` |
| `voices.getShared` | `apps/api/src/services/narration/voice-registry.service.ts:266` | Requête et réponse en `camelCase` |

**Trois surprises trouvées en explorant :**

1. **Le flux de sortie change de nature.** `textToSoundEffects.convert` rend désormais un
   `ReadableStream<Uint8Array>` (flux web), alors que `streamToBuffer`
   (`audio.repository.ts:43`) est typé `Readable` (flux Node). Ce n'est pas un renommage :
   c'est le seul endroit où le code doit vraiment changer de forme.
2. **L'attente ne change pas.** Les méthodes rendent un `HttpResponsePromise<T>` qui **étend
   `Promise<T>`** : tous les `await` existants fonctionnent tels quels. Aucune adaptation.
3. **`Voice.name` est optionnel** dans le nouveau paquet. Le code filtre déjà sur
   `typeof voice.name === 'string'` (`:252`) — compatible par chance, à ne pas casser.

**Pas de test existant** sur ces deux fichiers : `apps/api/src/repositories/` ne contient aucun
répertoire de tests. Il faut en écrire.

**Hors périmètre mais constaté :** `voice-registry.service.ts:266` instancie directement un
client du fournisseur depuis un **service**, alors que `CLAUDE.md` réserve les appels d'API
externes aux repositories. C'est une violation de frontière préexistante. La spec exclut
explicitement toute réorganisation ; je ne la corrige pas et je propose une tâche de suivi en
fin de plan.

## Étapes

### Étape 1 — Basculer le dépôt audio

- **Sert les critères :** 1, 4, 5, 6
- **Fichiers :** `apps/api/src/repositories/audio/audio.repository.ts` (modifié)
- **Contenu :** remplacer l'importation par le paquet courant. Passer les trois appels et
  leurs objets de requête en `camelCase`. Adapter les lectures de réponse : `audioBase64`,
  `alignment.characterStartTimesSeconds`, `alignment.characterEndTimesSeconds`,
  `voice.voiceId`, `voice.previewUrl`. Adapter `streamToBuffer` au flux web rendu par
  l'appel d'effets sonores. **Ne toucher à aucune logique** : ni le calcul de durée depuis
  l'alignement (`:161-167`), ni la normalisation de stabilité, ni les replis existants — la
  spec interdit de les corriger ici.
- **Tests :** écrits **avant** — un jeu de tests sur un client simulé rendant les formes de
  réponse du nouveau paquet, vérifiant que le dépôt en extrait les mêmes valeurs qu'avant. Un
  test dédié au flux d'effets sonores, qui est le seul changement de forme réel.
- **État à la fin :** `nx run api:typecheck` et `bun test` passent. Le registre de voix
  continue d'utiliser l'ancien paquet, encore installé : le dépôt reste vert.

### Étape 2 — Basculer le registre de voix

- **Sert les critères :** 1, 5, 6
- **Fichiers :** `apps/api/src/services/narration/voice-registry.service.ts` (modifié)
- **Contenu :** remplacer l'importation et passer l'appel à la bibliothèque partagée en
  `camelCase`, requête comme réponse. Ne pas déplacer l'appel hors du service — c'est la
  tâche de suivi proposée, pas celle-ci.
- **Tests :** écrits **après** — la forme de la réponse de catalogue se découvre en écrivant,
  et c'est la méthode la plus susceptible d'avoir bougé au-delà de la casse.
- **État à la fin :** `nx run api:typecheck` et `bun test` passent. Plus aucune importation de
  l'ancien paquet.

### Étape 3 — Retirer l'ancien paquet

- **Sert les critères :** 1, 2, 6
- **Fichiers :** `package.json` (modifié), `bun.lock` (régénéré)
- **Contenu :** retirer `elevenlabs` des dépendances et réinstaller. Vérifier par recherche
  qu'aucune importation ni mention ne subsiste dans le dépôt.
- **Tests :** aucun test nouveau ; c'est la vérification de types et la recherche qui
  attestent.
- **État à la fin :** `nx run api:typecheck`, `bun test`, et une recherche de `'elevenlabs'`
  ne rendant que le paquet scopé.

### Étape 4 — Vérification comparative contre le fournisseur réel

- **Sert les critères :** 3, 4, 5
- **Fichiers :** aucun fichier de production
- **Contenu :** sur un script figé, générer une fois avec la version précédente et une fois
  avec la nouvelle, puis comparer les durées rapportées, la forme et les unités de
  l'alignement, et la liste de voix. C'est la seule étape qui prouve l'absence de changement
  de comportement.
- **Tests :** manuel, consigné.
- **État à la fin :** un relevé écrit de la comparaison, joint à la revue.
- **⚠ Cette étape ne peut pas être exécutée dans l'environnement de travail actuel**, le
  domaine du fournisseur étant bloqué. Elle demande une machine disposant d'une clé d'API et
  d'un accès réseau au fournisseur.

## Couverture des critères

| Critère | Étape(s) | Test / mesure |
|---|---|---|
| 1 — aucune importation de l'ancien paquet | 1, 2, 3 | Recherche dans le dépôt |
| 2 — plus dans les dépendances | 3 | Lecture de `package.json` |
| 3 — durées identiques | 4 | Comparaison sur génération réelle |
| 4 — alignement de même forme et unités | 1, 4 | Tests sur client simulé, puis comparaison réelle |
| 5 — liste de voix identique | 1, 2, 4 | Tests sur client simulé, puis comparaison réelle |
| 6 — types sans assertion ajoutée | 1, 2, 3 | `nx run api:typecheck` et relecture des `as` |

## Suppressions

| Fichier / symbole | Étape | Pourquoi c'est sûr |
|---|---|---|
| `import { ElevenLabsClient } from 'elevenlabs'` × 2 | 1, 2 | Remplacées, la compilation atteste |
| Dépendance `elevenlabs` de `package.json` | 3 | Plus aucune importation après l'étape 2 |

## Risques d'exécution

**Le changement de casse est massif mais bruyant.** Chaque champ renommé provoque une erreur
de compilation. Le risque n'est donc pas de le rater — c'est de le **contourner** avec une
assertion de type pour faire taire le compilateur. Le critère 6 existe exactement pour ça, et
toute assertion ajoutée doit être justifiée en revue.

**Le vrai risque est muet : un champ de même nom dont l'unité aurait changé.** Rien dans les
types ne le révélerait. Seule l'étape 4 le détecte. C'est pourquoi elle n'est pas facultative,
et pourquoi la tâche ne peut pas être close sans elle.

**Le flux d'effets sonores est le seul endroit où la logique change.** Si l'itération sur un
flux web ne se comporte pas comme sur un flux Node dans le runtime du projet, l'audio produit
serait tronqué — silencieusement. Le test dédié de l'étape 1 doit vérifier la **taille** du
tampon obtenu, pas seulement qu'il n'est pas vide.

**Tentation de périmètre à refuser :** les replis silencieux traversés par ces fichiers — durée
issue de l'alignement, estimation par taille de tampon — sont visibles pendant le travail et
resteront en place. Les corriger relève de T0202 et E04.

## Vérification finale

```
nx run api:typecheck
bun test
grep -rn "from 'elevenlabs'" --include='*.ts' apps packages   # doit ne rien rendre
grep -n '"elevenlabs"' package.json                            # doit ne rien rendre
```

Puis l'étape 4, sur une machine disposant d'un accès au fournisseur, et son relevé joint à la
revue. **Sans ce relevé, la tâche reste `en-revue` et ne passe pas `livree`.**

## Tâche de suivi proposée

`voice-registry.service.ts` appelle une API externe depuis un service, ce que `CLAUDE.md`
réserve aux repositories. Hors périmètre ici, mais à rattacher à E09 — ou à traiter dans T0203,
qui touchera de toute façon ce fichier.
