# Checklist de relecture d'une spécification

À passer avant de présenter une spec. Chaque question qui reçoit un « non » ou un « je ne
sais pas » signale un travail non terminé, pas un détail de style.

## Niveau d'abstraction

- [ ] Le **test des trois implémentations** passe : trois façons différentes d'implémenter
      satisferaient tous les critères.
- [ ] Aucun nom de fichier, de classe ou de fonction à créer n'apparaît (sauf dans la section
      *Contrats*, ou pour désigner du code **existant** qu'on décrit).
- [ ] Aucune séquence d'étapes d'implémentation (« d'abord créer X, puis modifier Y »).
- [ ] La spec resterait valable si on réécrivait l'implémentation de zéro dans un autre style.

## Preuves

- [ ] Chaque affirmation sur l'état actuel du code est appuyée par une référence
      `fichier.ts:ligne`.
- [ ] Chaque affirmation sur une API externe est appuyée par une note de `roadmap/research/`
      datée de moins de 90 jours, ou explicitement marquée comme non vérifiée.
- [ ] Les chiffres cités (durées, limites, tarifs) ont une source.

## Critères d'acceptation

- [ ] Chaque critère est falsifiable : je sais énoncer l'observation qui prouverait qu'il
      n'est pas rempli.
- [ ] Aucun adjectif d'appréciation sans mesure ni seuil (*fluide*, *naturel*, *propre*,
      *performant*, *amélioré*, *robuste*, *cohérent*).
- [ ] Les critères sont indépendants : cocher l'un n'implique pas de cocher l'autre.
- [ ] Chaque critère a une ligne dans la *Stratégie de vérification*.
- [ ] Les critères couvrent aussi les cas d'erreur, pas seulement le cas nominal.

## Complétude

- [ ] Le hors-périmètre est écrit, avec les raisons.
- [ ] Les cas limites sont traités : collection vide, un seul élément, valeur maximale,
      contenu inattendu produit par un LLM, appel externe qui échoue, appel externe qui
      réussit mais renvoie n'importe quoi.
- [ ] Pour chaque situation d'erreur, la spec dit **échec ou repli**, et si repli, comment il
      est journalisé. Aucun repli silencieux (`CONVENTIONS.md` §5).
- [ ] Le code que la tâche **supprime** est nommé. Une refonte qui n'enlève rien n'en est pas
      une.

## Cohérence projet

- [ ] La spec ne contredit aucun ADR accepté. Si elle le fait, c'est signalé explicitement.
- [ ] Tout module introduit sera atteignable depuis un handler, un workflow ou un script
      (`CONVENTIONS.md` §5, « rien de mort »).
- [ ] Aucune donnée n'est calculée ou définie à deux endroits.
- [ ] Si la tâche touche au temps audio : l'audio fait foi, la timeline se déduit de la
      mesure, jamais l'inverse.

## Utilisabilité

- [ ] Un développeur qui ne connaît pas le contexte peut lire cette spec seule et savoir
      quoi produire.
- [ ] Les questions ouvertes sont regroupées et adressées à quelqu'un.
- [ ] L'effort annoncé est cohérent avec le contenu. Si c'est `XL`, la tâche doit être
      découpée avant d'aller plus loin.
