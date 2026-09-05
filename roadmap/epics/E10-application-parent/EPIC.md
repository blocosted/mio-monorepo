---
id: E10
titre: Application parent
statut: a-faire
depend_de: [E06, E08]
adr: []
objectif_mesurable: "Trois parents extérieurs créent un compte, génèrent une histoire et l'écoutent jusqu'au bout, sans assistance"
---

# E10 — Application parent

*Découpage volontairement grossier : cet epic sera précisé quand les précédents seront
livrés. Le détailler maintenant reviendrait à décider avec les informations d'aujourd'hui
d'un travail qui commencera dans plusieurs mois.*

## Après cet epic, je peux…

Envoyer une adresse à un parent inconnu du projet et le voir créer un compte, un profil
enfant, lancer une histoire et l'écouter — sans aucune intervention.

## Pourquoi maintenant

C'est le jalon de distribution, et c'est l'étape la plus incertaine du projet : rien n'a
encore été mis entre les mains de quelqu'un d'extérieur. Tout ce qui précède sert à ce qu'il y
ait quelque chose qui vaille la peine d'être distribué ; à partir d'ici, l'enjeu change de
nature.

Il ne peut pas venir plus tôt : distribuer avant que l'audio soit bon (E02-E04) brûle des
premiers utilisateurs qu'on n'a qu'en stock limité, et distribuer sans propriété des données
(E08) ni garde-fous (E06) est exclu.

## Périmètre

**Dans :** parcours complet inscription → profil → histoire → écoute · lecteur audio ·
bibliothèque des histoires · suivi de la génération en cours · gestion des erreurs en
langage clair.

**Hors :** l'enfant comme source d'entrée — E11. Ici le parent reste aux commandes, comme
aujourd'hui, mais dans une vraie application.

**Réutilisable :** l'ancienne planification contient treize interfaces déjà décrites
(profils, saisie initiale, lecteur, bibliothèque, suivi de génération) reportées à ce stade
— voir `roadmap/archive/TRI-EXISTANT.md`. Leurs critères d'acceptation sont réutilisables.

## Critères de sortie

1. Un parent extérieur va de l'inscription à l'écoute sans assistance ni explication.
2. Trois parents extérieurs le font, et écoutent une histoire jusqu'au bout.
3. Au moins un revient de lui-même en générer une deuxième.
4. Aucune erreur technique n'est affichée en langage de développeur.

## Tâches pressenties

Non détaillées à ce stade. Blocs identifiés : inscription et connexion · profils enfants ·
création d'histoire · suivi de génération · lecteur · bibliothèque · erreurs et états vides ·
application installable.

## Dépendances et risques

Dépend de **E06** et **E08**.

**Risque principal :** ce n'est pas un risque technique. Trouver trois parents extérieurs
disposés à essayer est le vrai obstacle, et il n'est pas résolu par du code. À préparer bien
avant que l'epic ne commence.

## Questions ouvertes

- Comment recruter les trois premiers parents ? C'est la question qui décide de la réussite
  de cet epic, et elle ne se résout pas par du code. **Décision en attente**, à préparer bien
  avant le début de l'epic.
