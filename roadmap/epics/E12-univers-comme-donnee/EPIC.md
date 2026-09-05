---
id: E12
titre: L'univers comme donnée
statut: a-faire
depend_de: [E11]
adr: []
objectif_mesurable: "Un univers ajouté sans déploiement produit des histoires reconnaissables comme siennes"
---

# E12 — L'univers comme donnée

*Découpage volontairement grossier. C'est la fondation de la place de marché, pas la place de
marché elle-même.*

## Après cet epic, je peux…

Ajouter un univers — décor, personnages, règles, thèmes interdits, registre de langue — sans
toucher au code ni redéployer, et entendre des histoires qui en portent la marque.

## Pourquoi maintenant

C'est ce qui rend la place de marché atteignable. Aujourd'hui l'univers est une chaîne libre
dans un prompt : il n'existe aucune entité monde, trame ou personnage réutilisable, et le
seul vocabulaire structuré est une liste fermée de huit ambiances codées en dur à trois
endroits, avec repli silencieux sur la première. Un auteur n'aurait nulle part où déposer ce
qu'il vend.

Il vient en dernier parce qu'il ne sert à rien avant qu'il y ait des auditeurs. Mais une
règle s'applique **dès maintenant** : ne pas répandre le vocabulaire fermé plus loin qu'il ne
l'est. À trois endroits, la refonte coûte quelques jours ; à quinze, c'est un chantier.

## Périmètre

**Dans :** modèle de données d'un univers versionné · consommation de l'univers par la
génération à la place des valeurs codées en dur · notion d'auteur et de statut de publication ·
au moins deux univers de démonstration produits en interne.

**Hors :** paiement, commission, structure juridique, reversement — la place de marché
elle-même, qui exige une entité, une intermédiation de paiement et un reporting fiscal
(`PRODUIT.md` §5). Cet epic pose la fondation technique, pas le commerce.

**Hors aussi :** l'ouverture à des créateurs extérieurs. Le modèle retenu est celui de
créateurs vérifiés et recrutés, pas d'un dépôt ouvert — la modération devient du sourcing.

## Critères de sortie

1. Un univers est une donnée versionnée, pas une chaîne dans un prompt.
2. Ajouter un univers ne demande ni modification de code ni déploiement.
3. Deux univers différents, sur le même point de départ et le même profil, produisent des
   histoires qu'un auditeur attribue au bon univers.
4. Les valeurs de vocabulaire codées en dur ne le sont plus, ou sont devenues de simples
   valeurs par défaut du moteur.
5. Un univers porte un auteur et un statut de publication.

## Tâches pressenties

Non détaillées. Blocs identifiés : modèle de données de l'univers · migration du vocabulaire
fermé vers des valeurs par défaut · consommation par l'enrichissement et la génération ·
auteur et publication · deux univers de démonstration · outil de création d'univers dans le
backoffice.

## Dépendances et risques

Dépend de **E11**.

**Risque principal :** concevoir ce modèle sans auteur réel produira le mauvais modèle. Le
premier univers extérieur révélera ce qui manque. Recruter un créateur avant de figer le
modèle vaut mieux que l'inverse.

**Risque secondaire :** la tentation de construire la place de marché complète dans cet epic.
Le hors-périmètre est là pour ça.

## Questions ouvertes

- Un univers contraint-il seulement l'enrichissement, ou aussi la voix, la musique et
  l'ambiance ? La seconde option est bien plus riche — un univers avec sa palette sonore — et
  bien plus coûteuse. **Décision produit majeure en attente** au moment
  d'attaquer cet epic, pas avant.
