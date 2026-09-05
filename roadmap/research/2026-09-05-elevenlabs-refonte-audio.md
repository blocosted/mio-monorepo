---
sujet: elevenlabs-refonte-audio
date: 2026-09-05
question: "L'architecture ElevenLabs actuelle permet-elle de supprimer tout placement temporel côté Mio — voix, bruitages, musique ?"
statut_fraicheur: frais
concerne: [E02, E03, E04, S01]
---

# ElevenLabs — état au 5 septembre 2026

## Question

La refonte audio repose sur un pari : déléguer la synchronisation au fournisseur et supprimer
le moteur de timeline de Mio. Trois capacités doivent tenir pour que ce pari soit gagnant —
la synthèse multi-voix en une passe, les bruitages portés par le script, et une génération
musicale à la longueur voulue.

## Réponse courte

**Oui pour la voix, oui pour la musique, incertain pour les bruitages.**

La synthèse multi-voix en une passe existe et le modèle est désormais en disponibilité
générale, pas en préversion. La génération musicale couvre largement la durée d'une histoire.
Mais les **tags audio, y compris les bruitages en ligne, sont rapportés comme peu fiables et
dépendants de la voix** — c'est le point faible du pari, et il touche précisément la partie
que je proposais de supprimer côté Mio.

Deux découvertes améliorent le tableau : un endpoint de dialogue **avec horodatages**, qui
donne un alignement issu de l'audio réellement produit, et un paramètre de **graine** qui
rend les régénérations à peu près reproductibles.

## Constats

> Le domaine `elevenlabs.io` est bloqué par le proxy réseau de l'environnement de travail.
> Aucune page de documentation n'a pu être lue directement. Tout ce qui suit provient de
> résultats de recherche, dont certains citent la documentation officielle sans que la page
> ait pu être consultée. Aucun fait de cette note n'atteint le niveau **vérifié**.

| Fait | Certitude | Source |
|---|---|---|
| Eleven v3 est passé en disponibilité générale début 2026 (dates rapportées divergentes : 2 février ou 14 mars) | rapporté | blog officiel relayé, revue tierce |
| La synthèse de dialogue multi-voix n'existe que sur v3 | rapporté | doc officielle relayée |
| Limite recommandée : environ 2 000 caractères par requête, tous tours confondus | rapporté | doc officielle relayée |
| Maximum 10 identifiants de voix distincts par requête ; nombre de tours non limité | rapporté | doc officielle relayée |
| Un endpoint de dialogue **avec horodatages** existe | rapporté | doc officielle relayée |
| Un paramètre de graine existe (entier 0 à 4 294 967 295, 0 exclu) ; déterminisme au mieux, non garanti | rapporté | doc officielle relayée |
| Les tags audio sont des **instructions en langage naturel entre crochets**, pas une énumération fermée | rapporté | doc officielle relayée |
| Les tags sont expérimentaux, dépendants de la voix, et d'efficacité irrégulière | rapporté | plusieurs retours d'usage concordants |
| La couture entre requêtes exige la journalisation activée ; le mode sans rétention la désactive | rapporté | doc officielle relayée |
| Génération musicale : 3 s à 600 s en mode consigne, 3 s à 300 s avec plan de composition | rapporté | doc officielle relayée |
| Paramètre garantissant une musique instrumentale | rapporté | doc officielle relayée |
| Musique réservée aux offres payantes ; droits commerciaux inclus sauf cinéma, télévision et gros jeux (offre entreprise) | rapporté | doc et analyses tierces |
| Tarif indicatif v3 : environ 0,10 $ pour 1 000 caractères ; environ 1 000 crédits par minute d'audio | rapporté | comparatifs tiers 2026 |

## Limites et contraintes

**Découpage.** La limite d'environ 2 000 caractères impose de découper une histoire de cinq
minutes en deux ou trois requêtes. Le nombre de personnages simultanés (10 voix) est
largement suffisant.

**Continuité entre blocs.** La couture entre requêtes dépend de la journalisation. Un mode
sans rétention des données la désactive — arbitrage direct entre minimisation des données et
continuité prosodique, qui mérite d'être tranché consciemment pour un produit destiné aux
enfants.

**Reproductibilité.** La graine rend les régénérations approximativement stables, ce qui
atténue nettement le coût du passage d'une granularité par segment à une granularité par
bloc.

**Coût.** Une histoire de cinq minutes représente environ 3 500 caractères de texte prononcé,
soit de l'ordre de 0,35 $ pour la voix, hors reprises et hors musique. Ordre de grandeur
cohérent avec l'estimation de janvier 2026 conservée dans l'archive.

## Ce que ça ne fait pas

- **Aucun mixage multipiste.** Voix et musique arrivent en fichiers séparés. L'assemblage,
  l'équilibre des niveaux, l'atténuation de la musique sous la voix et la masterisation
  restent entièrement à la charge de Mio.
- **Aucune gestion d'ambiance longue.** La musique est de la musique ; un lit d'ambiance
  continu reste à produire et à boucler côté Mio.
- **Aucune garantie sur les tags.** Rien n'assure qu'un bruitage demandé sera produit, ni
  qu'il le sera au même endroit d'une génération à l'autre.
- **Aucun découpage automatique.** Au-delà de la limite de caractères, le découpage et le
  raccord sont à la charge de l'appelant.

## Ce que ça implique pour Mio

**Ce que ça confirme.** Le pari de E02 tient : la synthèse multi-voix en une passe supprime
la concaténation, les blancs calculés et l'isolement prosodique. Le modèle étant en
disponibilité générale, le risque de rupture est nettement plus faible qu'anticipé. L'endpoint
avec horodatages donne en prime un alignement issu de l'audio réel — exactement le principe
« l'audio fait foi » posé dans les conventions, obtenu sans effort.

**Ce que ça remet en cause.** L'approche retenue pour les bruitages dans **E03** repose sur
des tags en ligne dont la fiabilité est douteuse. Le critère de sortie n° 4 de E03 — un écart
inférieur à 300 ms sur les derniers bruitages — pourrait être inatteignable, non par
imprécision temporelle mais parce que le son peut ne pas être produit du tout. **Le spike doit
mesurer un taux de déclenchement avant que E03 ne soit spécifié**, et un repli doit être
prévu : revenir à une piste de bruitages placée par Mio, ce qui réintroduit un besoin de
placement — mais un placement désormais adossé à un alignement réel, donc sans la dérive qui
gâchait le pipeline précédent.

**Ce que ça coûte.** Un abonnement payant est nécessaire pour la musique. Le coût de la voix
est du même ordre qu'aujourd'hui, avec un surcoût sur les reprises puisqu'on régénère un bloc
plutôt qu'un segment — atténué par la graine.

**Ce qu'il faut décider.** Journalisation activée pour la continuité prosodique, ou mode sans
rétention pour la minimisation des données. Les deux sont défendables ; le choix doit être
tracé par un ADR et non subi par défaut.

## Non vérifié

- **Tout.** Aucune page officielle n'a pu être lue, le domaine étant bloqué par le proxy.
  Chaque chiffre de cette note doit être reconfirmé avant d'être inscrit dans une
  spécification.
- Le taux réel de déclenchement des tags de bruitage. Aucune source chiffrée fiable ; les
  retours d'usage vont de « fonctionne bien » à « une fois sur six ». **Seul un appel réel
  tranchera** — c'est un objectif explicite du spike S01.
- Le comportement des tags en français. Toutes les sources consultées portent sur l'anglais,
  alors que le contenu de Mio est majoritairement francophone.
- Les tarifs exacts au 5 septembre 2026, et l'existence d'une éventuelle remise.
- La politique de modération du fournisseur sur du contenu destiné aux enfants.

**Comment lever le doute :** un appel d'API réel dans S01 vaut mieux que n'importe quelle
page de documentation, et lève d'un coup les trois premiers points.

## Sources

- [Text to Dialogue](https://elevenlabs.io/docs/overview/capabilities/text-to-dialogue) — non consultée, domaine bloqué
- [Create dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert) — non consultée
- [Create dialogue with timestamps](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert-with-timestamps) — non consultée
- [Eleven Music](https://elevenlabs.io/docs/overview/capabilities/music) — non consultée
- [Compose music](https://elevenlabs.io/docs/api-reference/music/compose) — non consultée
- [Eleven v3 is Now Generally Available](https://elevenlabs.io/blog/eleven-v3-is-now-generally-available) — non consultée
- [How do audio tags work with Eleven v3?](https://help.elevenlabs.io/hc/en-us/articles/35869142561297-How-do-audio-tags-work-with-Eleven-v3) — non consultée
- [ElevenLabs v3 Is Now GA — revue tierce](https://inworld.ai/resources/elevenlabs-v3-review) — consultée via recherche le 5 septembre 2026
- [Retour d'usage sur les tags v3](https://oguzhankocakli.medium.com/t-4my-experience-with-elevenlabs-v3-what-actually-works-421e7308ddb1) — consultée via recherche
- [ElevenLabs Music V2 et droits commerciaux](https://www.mindstudio.ai/blog/elevenlabs-music-v2-commercial-content-licensed-ai-music) — consultée via recherche
