---
id: E08
titre: Propriété et accès
statut: a-faire
depend_de: []
adr: []
objectif_mesurable: "Deux familles utilisent le service sans qu'aucune donnée de l'une ne soit accessible à l'autre, vérifié par un test d'isolation"
---

# E08 — Propriété et accès

## Après cet epic, je peux…

Donner l'adresse du service à un parent extérieur sans lui donner accès aux données des
autres familles.

## Pourquoi maintenant

C'est le verrou du jalon « trois parents extérieurs écoutent une histoire ». Aujourd'hui il
n'y a ni table d'utilisateurs, ni propriétaire de profil enfant, ni authentification sur
l'API — et l'ancienne planification ne contenait **aucune** tâche à ce sujet sur 63.

Il est indépendant des epics audio et peut être mené en parallèle si l'envie de changer de
sujet se fait sentir. Il devient bloquant dès qu'une personne extérieure doit écouter.

## Périmètre

**Dans :** modèle de propriété (compte, profil enfant rattaché) · authentification sur l'API ·
vérification de la signature du service de workflow · stockage privé et accès signés ·
rétention et suppression des données.

**Hors :** l'interface de connexion pour parent — E10. Ici on pose le modèle et la
protection, pas les écrans.

## Critères de sortie

1. Un profil enfant appartient à un compte ; aucun n'existe sans propriétaire.
2. Toute route de l'API exige une authentification, hors point de santé et rappels signés.
3. Un test d'isolation prouve qu'un compte ne peut lire ni modifier les données d'un autre.
4. Les rappels du service de workflow sont vérifiés par signature ; un appel non signé est
   rejeté.
5. Aucun fichier audio n'est accessible sans autorisation ; les accès sont signés et expirent.
6. Une demande de suppression de compte efface les données associées, y compris les fichiers.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0801 | Modèle de propriété | Comptes, rattachement des profils, migration des données existantes. | M |
| T0802 | Authentification de l'API | Vérification du jeton sur toutes les routes, et propagation de l'identité. | M |
| T0803 | Isolation vérifiée | Filtrage par propriétaire dans les accès aux données, avec test d'isolation. | M |
| T0804 | Signature des rappels | Vérifier la signature du service de workflow. La clé est déjà déclarée, jamais utilisée. | S |
| T0805 | Stockage privé | Bucket privé et accès signés expirants. | M |
| T0806 | Rétention et suppression | Durées de conservation, suppression effective, minimisation. | M |

## Dépendances et risques

Aucune dépendance technique. Un **ADR** sur le modèle de propriété est un préalable.

**Risque principal :** la migration des données existantes — profils et histoires sans
propriétaire. Décider tôt : rattacher à un compte d'administration, ou purger.

**Risque secondaire :** le stockage privé change toutes les adresses de fichiers déjà
enregistrées. À traiter comme une migration, pas comme un réglage.

## Questions ouvertes

- Le service d'authentification déjà utilisé par le backoffice couvre-t-il le besoin, ou
  faut-il autre chose ? Le plus court est de réutiliser l'existant. **À acter par ADR.**
- Rétention : combien de temps garde-t-on une histoire, un profil, un enregistrement ?
  **Décision produit et juridique en attente.**
