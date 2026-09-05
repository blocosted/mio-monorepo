---
id: E06
titre: Garde-fous enfant
statut: a-faire
depend_de: [E05]
adr: []
objectif_mesurable: "Sur un jeu de cas adverses écrit à l'avance, aucun contenu inapproprié n'atteint la synthèse vocale"
---

# E06 — Garde-fous enfant

## Après cet epic, je peux…

Laisser un enfant écouter une histoire générée sans l'avoir relue moi-même.

Montrer à un parent ce qui empêche son enfant d'entendre quelque chose qui ne lui convient
pas, et le lui montrer dans le code, pas dans un prompt.

## Pourquoi maintenant

C'est la condition pour que quelqu'un d'autre que moi écoute. Aucun garde-fou n'existe
aujourd'hui : les prompts système ne contiennent aucune contrainte de contenu, et la seule
validation porte sur la forme du JSON et le nombre de mots. Rien ne regarde ce que l'enfant
va entendre.

C'est aussi le premier scénario que testera un tiers hostile — journaliste, concurrent, ou
simplement un parent curieux.

Le repousser au-delà de E05 serait tentant, mais l'ordre inverse serait pire : améliorer
l'écriture d'un système qui n'a aucune limite, c'est le rendre plus convaincant sans le
rendre plus sûr.

## Périmètre

**Dans :**
- Des contraintes de contenu explicites dans les prompts
- Une vérification de **sortie** du script avant synthèse — le point le plus important
- Le bornage des entrées qui atteignent un prompt
- Un jeu de cas adverses, écrit à l'avance, rejoué à chaque changement
- Un chemin de signalement vers le parent

**Hors :**
- La modération de contenus tiers — E12, quand il y aura des créateurs
- L'authentification et la propriété des données — E08 ; c'est de la sécurité, pas de la
  protection du contenu

## Critères de sortie

1. Un jeu d'au moins vingt cas adverses est écrit, couvrant violence, peur, thèmes adultes,
   détresse exprimée par l'enfant et tentative de détournement du prompt.
2. Sur ce jeu, aucun contenu inapproprié n'atteint la synthèse vocale.
3. La vérification de sortie s'exécute sur tout script, avant synthèse, et son rejet est
   explicite et journalisé — jamais un repli silencieux vers un contenu générique.
4. Toute entrée utilisateur atteignant un prompt est bornée en longueur et en cardinal.
5. Un signalement parvient au parent quand un enfant exprime quelque chose d'inquiétant,
   sans que l'histoire ne réponde à sa place.
6. Le jeu de cas adverses tourne automatiquement et échoue bruyamment.

## Tâches pressenties

| Id | Titre | Intention | Effort |
|----|-------|-----------|--------|
| T0601 | Jeu de cas adverses | Écrire les cas avant les garde-fous, pour ne pas construire la serrure autour de la clé qu'on a. | M |
| T0602 | Contraintes dans les prompts | Consignes de contenu explicites — nécessaire, insuffisant, et assumé comme tel. | S |
| T0603 | Vérification de sortie | Contrôler le script produit avant synthèse, avec rejet explicite. Le garde-fou qui compte vraiment. | L |
| T0604 | Bornes sur les entrées | Longueur et cardinal sur tout ce qui atteint un prompt. | S |
| T0605 | Chemin de détresse | Détecter une expression inquiétante et la remonter au parent sans y répondre par une histoire. | M |

## Dépendances et risques

Dépend de **E05** : la vérification de sortie s'applique au format de script stabilisé.
Le critère 5 suppose qu'un parent soit joignable — donc un compte, donc **E08**. Tant que
E08 n'est pas livré, T0605 se limite au blocage et à la journalisation.

**Risque principal :** une vérification trop stricte rejettera des histoires légitimes — un
loup, une sorcière et une peur passagère font partie du conte. Le jeu de cas adverses doit
donc contenir des **cas légitimes** qui doivent passer, sinon on ne mesure que la sévérité.

**Risque secondaire :** le coût et la latence d'une vérification supplémentaire sur chaque
histoire. À mesurer.

## Questions ouvertes

- Où placer le curseur entre protection et richesse narrative ? Une histoire sans tension
  n'intéresse aucun enfant. **Décision produit en attente**, et à écrire
  dans `PRODUIT.md`.
- Que fait-on d'une histoire rejetée ? Régénérer, prévenir l'enfant, prévenir le parent. Le
  repli silencieux est exclu par les conventions.
