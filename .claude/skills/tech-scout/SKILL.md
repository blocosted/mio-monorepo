---
name: tech-scout
description: Mène une veille technique datée et sourcée sur une API, un modèle ou une bibliothèque, et l'archive dans roadmap/research/. Utilise ce skill dès qu'une question porte sur ce que sait faire aujourd'hui un service externe (ElevenLabs, Upstash, Supabase, Stripe, un modèle de LLM ou de TTS), sur ses limites, ses tarifs ou son statut de version — et systématiquement avant d'écrire une spécification qui en dépend. Utilise-le aussi quand l'utilisateur dit « je crois que X a évolué », « ça a peut-être changé depuis », ou partage un lien sur un outil.
---

# Tech Scout

Tu établis ce qui est vrai **aujourd'hui** d'une technologie externe, et tu l'archives pour
que personne n'ait à le refaire.

Lis `roadmap/CONVENTIONS.md` pour le nommage et l'emplacement des notes.

## Pourquoi ce skill existe

Ta mémoire d'entraînement a une date de péremption, et les API sur lesquelles Mio repose
bougent tous les mois. Le projet a déjà perdu du temps sur ce point précis : le pipeline
audio avait été conçu pour un état des API ElevenLabs largement dépassé, et six mois de
retard sur cette connaissance avaient rendu obsolète une bonne partie de l'architecture.

Donc : **ne réponds jamais de mémoire sur une capacité, une limite ou un tarif.** Va voir.
Et si tu ne peux pas aller voir, dis-le au lieu de combler.

## Méthode

1. **Formule la question en termes de décision.** « Que fait ElevenLabs ? » ne produit rien
   d'exploitable. « Peut-on générer plusieurs voix en une seule passe, et jusqu'à quelle
   longueur ? » se conclut. Si tu ne vois pas quelle décision dépend de la réponse, la veille
   est prématurée.

2. **Cherche large, puis vérifie étroit.** Une recherche pour trouver les pages, puis lecture
   de la **documentation officielle** pour les faits qui comptent. Les articles de blog et
   les comparatifs tiers sont des pistes, pas des sources.

3. **Distingue trois niveaux de certitude**, et marque-les explicitement dans la note :
   - **vérifié** — lu dans la documentation officielle du fournisseur
   - **rapporté** — trouvé dans une source tierce crédible, non confirmé à la source
   - **non vérifié** — n'a pas pu être établi (page inaccessible, information absente)

   Le troisième niveau est aussi précieux que les deux autres. Une note qui dit « le tarif
   n'a pas pu être vérifié, le proxy bloque le domaine » évite qu'on construise sur du sable.

4. **Relève systématiquement**, même sans qu'on te le demande :
   - le **statut de version** : alpha, beta, GA, *research preview*, déprécié
   - les **limites chiffrées** : caractères, durée, débit, concurrence, taille
   - le **modèle de tarification** et les conditions d'accès (offre payante requise ?)
   - le **déterminisme** : est-ce reproductible, y a-t-il une graine ?
   - ce que le service **ne fait pas** — souvent l'information la plus utile

5. **Conclus pour Mio.** Une note qui s'arrête aux faits oblige le lecteur suivant à refaire
   le raisonnement. Termine par ce que ça implique concrètement : ce que ça permet, ce que ça
   remplace, ce que ça coûte, ce que ça met en danger.

## Structure d'une note

Fichier : `roadmap/research/<YYYY-MM-DD>-<slug>.md`, daté du jour de la **vérification**.

```markdown
---
sujet: <slug>
date: 2026-09-05
question: "<la décision que cette note doit permettre de trancher>"
statut_fraicheur: frais    # frais (< 90 j) | a-reverifier (> 90 j) | perime
concerne: [E02, T0203]
---

# <Sujet> — état au <date>

## Question
<Ce qu'on cherchait à trancher.>

## Réponse courte
<Trois à cinq lignes. Suffisant pour décider sans lire la suite.>

## Constats

| Fait | Certitude | Source |
|------|-----------|--------|
| … | vérifié / rapporté / non vérifié | <url> |

## Limites et contraintes
<Chiffres. Statut de version. Conditions d'accès. Déterminisme.>

## Ce que ça ne fait pas
<La section qu'on oublie et qui évite les mauvaises surprises.>

## Ce que ça implique pour Mio
<Ce que ça permet. Ce que ça remplace ou rend inutile. Ce que ça coûte. Le risque à accepter.>

## Non vérifié
<Ce qui n'a pas pu être établi, et pourquoi. Ce qu'il faudrait faire pour l'établir —
un spike, un compte d'essai, une question au support.>

## Sources
- [titre](url) — consulté le <date>
```

## Fraîcheur

Une note de plus de **90 jours** est marquée `a-reverifier` et ne doit pas servir de base à
une nouvelle spécification sans être repassée. `roadmap-keeper` signale les notes périmées.

Quand tu rafraîchis une note, crée un **nouveau fichier** daté du jour et marque l'ancien
`perime` en le pointant vers le nouveau. L'historique des états successifs d'une API est
utile : il montre le rythme d'évolution du fournisseur, donc le risque qu'il représente.

## Quand la source est inaccessible

Il arrive que le réseau bloque un domaine, qu'une page exige un compte, ou qu'une
documentation soit muette. Ce n'est pas un échec de la veille : c'est un résultat. Écris la
note quand même, avec ce que tu as pu établir par recherche indirecte, et marque clairement
ce qui reste non vérifié. Propose le moyen de lever le doute — souvent un appel d'API réel
dans un spike vaut mieux qu'une page de documentation.

## En terminant

Écris la note, puis présente à l'utilisateur : la réponse courte, ce qui reste non vérifié,
et ce que ça change pour la décision en cours. Si la note invalide un ADR existant ou une
spec déjà écrite, dis-le en premier — c'est l'information la plus coûteuse à découvrir tard.
