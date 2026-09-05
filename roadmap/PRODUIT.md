# Mio — Produit

*Document de référence. Un epic qui ne sert aucun objectif décrit ici est probablement une
fausse bonne idée. Mis à jour le 5 septembre 2026.*

---

## 1. Ce qu'est Mio

Une application qui génère des **histoires audio personnalisées pour enfants**, construites à
partir des réponses de l'enfant lui-même plutôt que d'un formulaire rempli par un parent.
Ambition à terme : une place de marché où des créateurs vérifiés vendent les univers que le
moteur habite.

Le produit se juge à l'oreille. Tout le reste — l'architecture, les API, le modèle de
données — n'existe que pour servir ce qui sort du haut-parleur.

---

## 2. État réel, septembre 2026

Écrit sans complaisance, parce que les décisions de roadmap en dépendent.

**Ce qui existe et fonctionne :** un pipeline de génération en 9 étapes piloté par Upstash
Workflow, un backoffice d'administration, des bibliothèques audio persistantes, une
infrastructure de test avec conteneurs. C'est du travail sérieux.

**Ce qui n'existe pas :** il n'y a pas d'application. `apps/web` est une page d'accueil
statique avec deux liens morts. Le seul frontend réel est le backoffice, où **un adulte tape
un prompt libre**. Le chemin « l'enfant répond à des questions » est du code mort de bout en
bout : le champ `answers` est validé par l'API puis jeté, rien ne l'écrit jamais.

**Ce qui ne va pas :** le rendu audio est décevant — blancs mal gérés, tons plats, sons
d'ambiance désynchronisés, musique fabriquée en bouclant un clip de 22 secondes issu de l'API
d'effets sonores. La cause racine est un modèle temporel inversé : le système prédit des
durées puis fabrique de l'audio censé y correspondre.

**Ce qui manque structurellement :** aucune authentification sur l'API, aucune table
d'utilisateurs, aucune notion de propriétaire d'un profil enfant, aucun garde-fou de contenu.

---

## 3. Personas

### L'enfant (4-8 ans, cœur de cible ; 3-12 supporté)
Écoute au coucher, souvent seul, dans le noir, à faible volume. Il ne lit pas. Il choisit
plus qu'il ne rédige. Il décroche vite si le rythme est mou ou si une transition le sort de
l'histoire. **C'est lui l'auditeur, et c'est son expérience qui définit la qualité.**

### Le parent
Achète, installe, configure, et surveille. Il veut être rassuré avant d'être séduit : qui
écrit ces histoires, qu'est-ce que mon enfant entend, où vont ses données. Il n'écoutera
probablement l'histoire en entier qu'une fois. C'est le décideur, pas l'utilisateur.

### Le créateur vérifié (plus tard)
Illustratrice, autrice jeunesse, enseignant, orthophoniste. Vend un univers — décor,
personnages, règles, trames — pas une histoire. C'est l'offre de la place de marché, et
c'est ce qui la rend modérable.

### L'auditeur interne (aujourd'hui)
Le produit n'a pas encore d'auditeur extérieur : tout retour d'écoute vient de l'intérieur du
projet. L'outillage conditionne donc le rythme : tant qu'un rendu ne peut pas être généré,
mesuré et comparé en moins d'une heure, chaque amélioration coûte une session entière.

---

## 4. Le pari produit

Le générateur d'histoires IA personnalisées est **commoditisé** — Luni, Lunia, Oscar
Stories, Bedtimestory.ai, Fable, NinniTales, plus le matériel Yoto et Tonies. « Histoire avec
le prénom de l'enfant » n'est pas un produit, c'est le minimum vital.

**Aucun concurrent identifié n'a de place de marché.** C'est l'angle.

Mais une histoire générée à la volée n'existe pas avant d'être demandée : elle ne peut pas
être vendue. Ce qui se vend, c'est ce qui **encadre** la génération. Un auteur ne vend pas une
histoire, il vend un décor que le moteur habite ensuite.

Conséquence directe pour l'architecture : **l'univers doit être une donnée, pas une chaîne
dans un prompt.** Aujourd'hui il n'existe aucune entité univers, et le vocabulaire structuré
se réduit à huit ambiances codées en dur à trois endroits. Ce n'est pas bloquant tout de
suite — mais toute décision qui répand ce vocabulaire fermé plus loin rend la marketplace
plus chère.

**Créateurs vérifiés, pas pair-à-pair.** Une place de marché ouverte à des inconnus produisant
du contenu pour enfants est le produit le plus exposé qui existe. Le recrutement d'auteurs
identifiés résout d'un coup la modération (qui devient du sourcing), l'amorçage à froid, et la
qualité face à douze générateurs génériques.

---

## 5. Ce qu'on ne fait pas

- **Pas de boîtier physique.** 50 histoires sur 2 ans : ≈ 1 130 $ chez Toniebox, 610 $ chez
  Yoto, 75 $ en application. Jamais avant d'avoir des utilisateurs.
- **Pas de place de marché avant d'avoir des parents qui écoutent.** Elle exige en plus une
  structure juridique (intermédiation de paiement, Stripe Connect, entité, reporting DAC7).
  C'est assumé, mais ça vient après.
- **Pas de clonage de voix parentale, pas d'entrée vocale enfant**, tant que le régime
  juridique n'est pas traité. Le code n'en contient aucune trace aujourd'hui : c'est une
  décision à prendre, pas une dette à réparer.
- **Pas d'application parent avant que l'audio soit bon.** Distribuer un produit qui sonne mal
  brûle les premiers utilisateurs, et on n'en a qu'un stock limité.

---

## 6. Contraintes structurantes

| Contrainte | Conséquence sur la roadmap |
|---|---|
| Capacité de développement réduite et discontinue | Un epic doit être livrable en 1-3 semaines. Au-delà, il ne se termine pas. |
| La distribution est le goulot, pas la construction | Toute décision qui allonge le délai jusqu'au premier auditeur extérieur est suspecte. Construire mieux ne compense jamais l'absence d'auditeurs. |
| Boucle de retour audio lente | Ce qui raccourcit la boucle d'écoute passe avant ce qui améliore l'écoute. Un outillage qui permet de comparer dix versions en une heure vaut plus qu'une amélioration ponctuelle. |
| Coût par histoire | À surveiller dès le premier spike. Une architecture élégante à 3 € l'histoire n'est pas viable. |

---

## 7. Charte sonore

**La barre : une histoire du soir doit soutenir la comparaison avec une production
commerciale du commerce.** Formulée ainsi, l'ambition n'est pas actionnable — d'où cette
charte.

> **Les seuils numériques font autorité dans `roadmap/audio/charte.json`.** Ce document
> explique *pourquoi* chaque critère existe et dans quel sens il pousse ; il ne recopie pas
> les valeurs, pour qu'elles ne divergent jamais. `audio-qa` mesure contre le JSON.

### Le principe directeur

Une histoire du soir n'est ni un podcast ni un film. Elle s'écoute **à faible volume, sur un
petit haut-parleur, dans une pièce sombre, par un auditeur qui s'endort.** Les normes de
diffusion existantes visent d'autres usages ; les suivre aveuglément produirait un rendu
fatigant. Trois conséquences qui vont à l'encontre du réflexe habituel :

**On vise plus bas que la norme podcast.** Un niveau conçu pour être audible dans le métro
est agressif dans une chambre. La constance d'une histoire à l'autre compte davantage que la
valeur absolue : rien n'est pire qu'une histoire plus forte que la précédente.

**Une dynamique large est un défaut, pas une qualité.** Au cinéma on la recherche ; ici elle
oblige le parent à monter le son pour entendre un murmure, puis le cri fait sursauter
l'enfant. On resserre. Deux critères la mesurent : la plage de loudness globale, et la
**marge de sursaut** — l'écart entre le pic court terme et le niveau moyen — parce qu'une
statistique globale peut masquer un seul à-coup violent.

**Les blancs sont un matériau, pas un résidu.** Ce sont eux qui donnent le rythme et
laissent l'imagination travailler. Trop courts, le récit bafouille ; trop longs, l'enfant
décroche ; irréguliers, l'oreille sent le montage sans savoir l'expliquer. On mesure leur
distribution — médiane, 90ᵉ centile, maximum — et pas seulement leur moyenne, parce que c'est
un blanc aberrant sur trente qui gâche une histoire.

### Les critères

| Critère | Ce qu'il attrape | Sens |
|---|---|---|
| Niveau intégré (LUFS) | volume perçu | fenêtre étroite, pour la constance entre histoires |
| True peak (dBTP) | saturation inter-échantillon | plafond bas : les petits haut-parleurs n'ont aucune marge |
| Plage de loudness (LU) | écart doux / fort | plafonné |
| Marge de sursaut (LU) | à-coups ponctuels | plafonnée |
| Écrêtage | distorsion numérique | zéro toléré |
| Silence de tête et de queue | amorce et chute | fenêtres — ni démarrage net, ni coupure sèche |
| Blancs internes : médiane, p90, max | le montage | fenêtre pour la médiane, plafonds pour p90 et max |
| Équilibre des stems | rapport voix / musique / ambiance | écart cible en LU, mesuré stem par stem |

### Ce que la mesure ne dit pas

Un mix conforme peut sonner mal, et c'est le cas intéressant : la charte est alors
incomplète, et il faut chercher quelle grandeur aurait attrapé ce qu'on a entendu. Un mix
hors charte peut sonner bien — on ajuste le seuil, on ne force pas le mix.

**La charte est un filet, pas un objectif.** Son rôle est d'attraper les régressions, pas de
définir le beau. Toute fiche d'écoute comporte une partie mesurée et une partie écoutée, et
la seconde n'est pas facultative (`.claude/skills/audio-qa/references/protocole-ecoute.md`).

### Étalonnage

Les seuils actuels sont des **hypothèses à valider à l'oreille**, dérivées du raisonnement
ci-dessus et non de mesures. La façon de les fonder : mesurer deux ou trois histoires audio
commerciales et ranger les résultats dans `roadmap/audio/references/`. C'est ainsi que
« qualité professionnelle » cesse d'être une opinion. Une heure d'investissement, qui sert
tout le projet.

---

## 8. Sécurité enfant

Non négociable, et actuellement inexistant dans le code.

**Les garde-fous vivent dans le code, pas seulement dans un prompt.** Un prompt système se
contourne, y compris involontairement par un enfant de six ans. La vérification de **sortie**
compte plus que celle d'entrée : c'est le seul endroit où l'on regarde ce que l'enfant va
réellement entendre.

**Rien n'est distribué sans propriétaire.** Aucune donnée d'enfant ne doit être accessible
sans authentification liant un profil à un compte. Ce n'est pas un endpoint oublié : la
notion n'existe pas dans le schéma. Donner l'application à deux familles aujourd'hui, ce
serait leur donner les données l'une de l'autre.

**Un chemin de sortie vers le parent.** Si un enfant exprime quelque chose d'inquiétant,
répondre par une histoire de dragon est un vrai problème produit — et le premier scénario que
testera un journaliste. Ce chemin n'existe pas ; il devra exister avant que l'enfant soit une
source d'entrée.

**Minimisation.** On ne collecte pas ce dont on n'a pas besoin. Toute donnée nouvelle sur un
mineur exige une justification écrite dans la spec qui l'introduit.

---

## 9. Comment on saura qu'on avance

Dans l'ordre, et pas en parallèle :

1. **Une histoire passe la charte sonore et me plaît à l'écoute.** C'est le jalon qui
   débloque tout le reste. Tant qu'il n'est pas franchi, distribuer serait gâcher.
2. **Je génère, mesure et compare un rendu en moins d'une heure.** L'outillage, pas le
   produit — mais c'est ce qui fixe le rythme de tout ce qui suit.
3. **Trois parents extérieurs écoutent une histoire jusqu'au bout et en redemandent.** Le
   premier signal de distribution réel, et l'étape la plus incertaine du projet.
4. **Un enfant fabrique son histoire lui-même** — le pari produit d'origine.
5. **Un créateur extérieur publie un univers** — la place de marché.
