# Spécification technique et suivi de projet

Ce document complète le cahier des charges officiel. Il explique les
décisions prises pendant le développement, ce qui a été réalisé, et les
limitations connues, pour qu'une reprise du projet n'ait pas à redécouvrir
le contexte.

## Cahier des charges officiel

Le projet suit le cahier des charges "Bot Discord HyperPlanning HEAJ" (25
septembre 2026). Points clés :

- Bot Discord en JavaScript, consultation en message privé uniquement,
  jamais ajouté à un serveur.
- Source de données : l'Espace Invité HyperPlanning/PRONOTE Campus, en
  accès libre, sans authentification, sans export iCal/ICS.
- Cache avec rafraîchissement périodique, pour ne pas surcharger le
  serveur de l'école.

Ce document couvre aussi des demandes exprimées ensuite directement par
l'utilisateur, qui *surclassent* certains points du cahier des charges
écrit (voir "Écarts assumés par rapport au cahier des charges écrit"
ci-dessous).

## Écarts assumés par rapport au cahier des charges écrit

Le cahier des charges original demandait de "Mémoriser le groupe de chaque
étudiant pour éviter de le ressaisir" (objectif #3, CU-02, EF-01/EF-02).
L'utilisateur a explicitement demandé, en cours de développement, de
**ne stocker aucune donnée** — pas de base de données, pas de fichier, pas
de préférence liée à un compte Discord. Seul le lien géré nativement par
Discord (installation de l'app sur le compte utilisateur) subsiste.

Ce choix a été suivi tel quel : `/groupe definir` et `/groupe voir` ont été
supprimés ; chaque commande de consultation demande désormais
explicitement un programme et un groupe via deux menus déroulants (voir
plus bas). C'est un compromis assumé de confidentialité contre confort
d'usage, sur demande directe et répétée de l'utilisateur.

Autres demandes intégrées : commandes en anglais, réponses visibles par
tout le monde en option (`public`), format d'affichage alternatif
("tableau compact"), filtre `hide_cancelled`, et filtre `option` pour ne
garder que les cours d'un sous-groupe/spécialisation précis (ex: "Game
Art" en B2) + les cours communs, en masquant les autres sous-groupes.

Autre écart : le cahier des charges (EF-04) prévoyait que `/tomorrow`
saute au lundi si aujourd'hui est vendredi ou samedi, en supposant qu'il
n'y a jamais cours le samedi. Constaté faux en testant (certains
sous-groupes/options ont bien cours le samedi, ex: B2J4/B2TA1 le 26
septembre 2026) — corrigé sur signalement de l'utilisateur : `/tomorrow`
affiche désormais littéralement le jour civil suivant, samedi inclus.

**V1.1** — le cahier des charges original précisait "jamais ajouté à un
serveur" (consultation en message privé uniquement). Sur demande de
l'utilisateur, le bot est désormais aussi installable sur un serveur
Discord (`ApplicationIntegrationType.GuildInstall` + contexte `Guild`,
voir `src/utils/groupOptions.js` et `src/commands/help.js`), utilisable
par n'importe qui sur ce serveur, sans restriction de rôle. Le principe
"zéro donnée" n'est pas remis en cause : aucune config par
serveur/salon n'a été ajoutée, chaque commande continue de demander
programme + groupe explicitement, exactement comme en DM. `/admin` reste
volontairement exclu du contexte `Guild` (contextes inchangés : DM +
groupe privé uniquement) — il n'a aucune raison d'être exposé sur un
serveur, même s'il resterait de toute façon bloqué pour qui n'est pas
`ADMIN_DISCORD_ID`.

## Comment les données sont récupérées

L'Espace Invité est une application web monopage qui charge tout son
contenu via des appels internes non documentés. Le bot pilote un
navigateur headless (Puppeteer) qui reproduit les actions d'une personne
visitant la page :

1. Ouvrir `/hp/invite` et fermer le bandeau de confidentialité s'il
   apparaît.
2. Taper le code du groupe (ex: `B1J1`) dans le champ "Sélectionnez une
   promotion" et cliquer sur le résultat correspondant.
3. Basculer sur la vue "en liste" (`[data-genre="DIPLOME.EDT.EDT_LISTE"]`),
   dont le texte est directement exploitable (dates et heures en clair,
   annulations indiquées explicitement), contrairement à la vue "en
   grille" qui encode les créneaux sous une forme propriétaire (`p`, `d`,
   `dom`).
4. Extraire les lignes du tableau (`[data-colonne]` : horaires, matière,
   enseignant, salle, type) et les regrouper par en-tête de jour.

Piège rencontré : l'espace entre le code et le libellé d'une promotion
(`"B1J1 ‑ ..."`) est une espace insécable (U+00A0), pas une espace
normale — une comparaison naïve échouait silencieusement.

## Fuseau horaire (RG-04)

Les heures du site sont des heures murales de Bruxelles. Pour un affichage
correct quel que soit le fuseau du serveur hébergeant le bot, les horaires
ne sont pas construits avec l'heure locale du processus Node — un calcul
explicite (`Intl.DateTimeFormat` avec `timeZone: 'Europe/Brussels'`)
détermine le décalage UTC réel (CET/CEST) au moment de chaque cours.

## Sélection du groupe : menu déroulant en deux étapes

Discord limite une liste de choix fixe à 25 entrées par option, très
insuffisant pour la centaine de groupes de l'école. La solution retenue :

1. **`program`** : menu déroulant fixe (≤ 25 filières), défini dans
   `src/data/filieres.js`.
2. **`group`** : autocomplétion Discord, filtrée localement par la filière
   déjà choisie — **aucune requête au serveur HEAJ** à ce stade.

### Pourquoi le catalogue est assemblé à la main, pas généré automatiquement

Une tentative de construire ce catalogue en interrogeant le champ de
recherche de l'Espace Invité avec des requêtes larges ("B1", une lettre à
la fois, etc.) a d'abord fonctionné (~48 résultats pour "B1"), puis a cessé
de renvoyer le moindre résultat après un usage répété pendant les tests —
y compris pour des requêtes qui avaient fonctionné quelques minutes plus
tôt. C'est le signe probable d'une défense anti-énumération côté serveur.
Les requêtes précises (code de groupe exact, ex: `B1J1`) continuent en
revanche de fonctionner de façon fiable.

Continuer à insister sur des requêtes larges pour construire un catalogue
aurait été contraire à l'objectif de ne pas surcharger le serveur de
l'école, et aurait pu être perçu comme une tentative de contournement
d'une protection anti-scraping — une ligne que ce projet ne franchit pas.

Le catalogue dans `src/data/filieres.js` a donc été assemblé à la main à
partir de données observées de façon incidente pendant le développement
(résultats de recherche obtenus avant le blocage, résumé texte d'un
événement "Rentrée" trouvé dans un ancien flux). **Il n'est probablement
pas exhaustif** — des filières ou groupes peuvent manquer. Mise à jour :
éditer directement ce fichier (aucune requête serveur nécessaire).

## Navigation vers une autre semaine : résolue (±1 semaine)

Le cahier des charges et l'utilisateur ont demandé de pouvoir consulter
d'autres semaines que la semaine courante. Ce point a fait l'objet d'une
investigation approfondie, documentée ici pour éviter de la répéter :

- Le sélecteur de semaines de l'Espace Invité (une bande de cellules
  numérotées 37, 38, 39...) porte la classe CSS `ie-draggable-handle` et
  un attribut ARIA décrivant une "Multi-séléction de semaines, naviguez
  avec les flèches gauche et droite et validez avec les touches
  [Entrée/Espace]".
- **Le clic (réel, via automatisation navigateur, ou synthétique) sur une
  cellule ne fait rien** : ni sélection, ni navigation, quelle que soit la
  méthode testée.
- **La navigation clavier fonctionne, mais seulement pour un déplacement
  isolé** : focus la cellule sélectionnée (semaine courante) → `Entrée`
  bascule (toggle) sa sélection → `ArrowRight`/`ArrowLeft` déplace le focus
  d'une cellule → `Entrée` bascule la nouvelle cellule. Ce cycle
  "focus → toggle → flèche → toggle" fonctionne de façon fiable pour un
  déplacement d'une semaine.
- **Chaîner plusieurs flèches sans toggle intermédiaire ne fonctionne
  pas** : après un premier `ArrowRight` réussi, les pressions suivantes
  n'ont plus d'effet observable (le focus reste bloqué), y compris avec
  des délais de 1s entre chaque touche. Re-cliquer réellement sur la
  cellule nouvellement focus avant chaque flèche suivante n'a pas non plus
  résolu le problème, et a même provoqué un résultat incohérent (retour à
  l'état initial au lieu de l'état attendu), suggérant un état interne du
  composant qui se désynchronise du focus DOM réel après la première
  interaction.
- Positionner le focus DOM directement sur une cellule distante (sans
  passer par les flèches) puis presser `Entrée` ne fonctionne pas non plus
  — le composant semble suivre un état interne de "curseur en surbrillance"
  distinct du focus DOM, mis à jour uniquement par de vrais événements
  clavier de déplacement successifs, dont la chaîne se rompt après le
  premier pas.

**Investigation complémentaire (deuxième session)**, sur demande explicite
de l'utilisateur de retenter : trois pistes supplémentaires testées, toutes
négatives.

- **URL** : l'état sélectionné (groupe, vue, semaine) n'est jamais reflété
  dans l'URL du navigateur (reste `.../hp/invite` en permanence) — pas de
  deep-link possible.
- **Autres vues** ("en planning", "en planning général") : elles
  réutilisent exactement le même composant de sélection de semaines que
  "en liste", avec la même limitation.
- **Re-clic réel avant chaque flèche** (avec l'API `.click()` native de
  Puppeteer, pas des coordonnées calculées à la main) pour reconstituer le
  cycle "clic → flèche → Entrée" à chaque étape individuellement : toujours
  bloqué après le premier mouvement.
- **Timing beaucoup plus lent** (1 à 2 secondes entre chaque touche, pour
  exclure un problème de cadence) : cette fois, même le déplacement d'**une
  seule** semaine — qui fonctionnait de façon reproductible plus tôt dans
  la session précédente — a échoué de façon constante sur deux essais
  indépendants et frais (nouveau navigateur, nouvelle sélection de groupe
  à chaque fois).

Ce dernier point est le plus significatif : un pattern identique, avec un
code identique, est passé de "fiable" à "systématiquement en échec" entre
deux sessions de test. Ce n'est pas cohérent avec un simple bug de
synchronisation d'état côté client — ça ressemble plutôt à un comportement
serveur qui a changé entre-temps (éventuellement une défense contre les
interactions automatisées répétées, dans la même veine que le blocage des
recherches larges documenté plus haut).

**Troisième session — la vraie cause trouvée.** Sur nouvelle insistance de
l'utilisateur ("ce n'est pas un contournement, il n'y a rien d'anormal"),
nouveau test du cas le plus simple (`+1` semaine) avec inspection de
`document.elementFromPoint()` au point exact de la cellule cliquée. Résultat
: un élément `<div id="id_..._bloquer" class="BloquerInterface
NePasImprimer SansSelectionTexte VoileOpaque50">` — un voile/backdrop à 50%
d'opacité — recevait le clic à la place de la cellule du calendrier, quelle
que soit la méthode de clic utilisée. Ce voile est permanent (toujours
présent après plusieurs secondes d'attente), pas un indicateur de
chargement transitoire.

En le retirant du DOM juste avant chaque interaction
(`document.querySelectorAll('.BloquerInterface').forEach(el => el.remove())`
— purement cosmétique, aucun contrôle d'accès réel : on ne fait que rendre
cliquable un contenu déjà public que ce voile masquait accidentellement au
clic), le cycle "clic → Entrée (désélectionne) → flèche → Entrée
(sélectionne)" fonctionne alors de façon fiable et reproductible (vérifié
sur plusieurs essais frais, deux groupes différents, `+1` et `-1`).

**Limite restante** : la flèche ne semble répondre correctement qu'**une
seule fois par chargement de page**, même en ré-établissant le focus par un
vrai clic entre chaque tentative — donc impossible de chaîner plusieurs pas
sur la même page pour atteindre une semaine arbitraire. En revanche, chaque
scraping de ce bot charge de toute façon une page fraîche à chaque appel
(`withPage` dans `scraper.js`), et une page fraîche démarre toujours sur la
semaine courante : on peut donc fiablement obtenir **semaine courante,
précédente (-1) ou suivante (+1)**, mais pas plus loin sans repartir d'une
page fraîche à chaque pas (ce qui ne permettrait toujours d'atteindre que
±1 par rapport à la semaine par défaut de CETTE page fraîche — sans
mémoire de "où on s'est arrêté", on ne peut donc pas enchaîner vers ±2).

**Conclusion** : `/today`, `/tomorrow`, `/week`, `/date` et `/next`
supportent désormais la semaine précédente, courante et suivante
(`weekOffset` -1/0/1 dans `scraper.js`/`cache.js`). Au-delà, message
explicite plutôt qu'une réponse incorrecte. Le cache est désormais clé par
`(code, weekOffset)` (voir `cache.js`).

## Choix techniques

| Décision | Raison |
| --- | --- |
| Node.js + discord.js (ESM) | Demandé explicitement par l'utilisateur. |
| Puppeteer (navigateur headless) | L'Espace Invité est une SPA sans API HTTP documentée ; reproduire les clics/saisies d'un navigateur réel est plus robuste que de reverse-engineer un protocole interne non stable. |
| Vue "en liste" plutôt que "en grille" | La grille encode les créneaux via des positions/identifiants propriétaires difficiles à décoder de façon fiable ; la liste donne des dates et heures en texte clair. |
| Aucun stockage (ni base de données, ni fichier) | Demande explicite de l'utilisateur (voir "Écarts assumés" ci-dessus). |
| Catalogue programme/groupe statique, assemblé à la main | Éviter une énumération automatique qui déclenche une défense anti-scraping côté serveur (voir plus haut). |
| Cache par **(groupe, décalage de semaine)** (pas par utilisateur), TTL configurable, en mémoire | Plusieurs étudiant·e·s du même groupe/semaine partagent une seule requête de scraping ; donnée publique, sans lien avec un utilisateur, cohérent avec l'objectif "aucune donnée stockée". |
| Application installable par utilisateur **et** par serveur, contextes DM + groupe privé + serveur (`integration_types`/`contexts` Discord, par commande) | Couvre nativement les contextes autorisés sans code de vérification supplémentaire. `/admin` reste volontairement limité à DM + groupe privé (V1.1) — les commandes de consultation ajoutent `GuildInstall`/`Guild` (V1.1, écart assumé par rapport au "jamais ajouté à un serveur" du cahier des charges original, voir ci-dessus). |
| URL de l'Espace Invité configurable en direct (`src/services/config.js`, `/admin set-url`), persistée dans `data/config.json` (gitignoré) | L'URL change de nom chaque année scolaire (ex: `heaj2627` → `heaj2728`) ; évite d'avoir à modifier le code et redéployer chaque rentrée. C'est une config admin globale, pas une donnée liée à un utilisateur — cohérent avec l'objectif "aucune donnée utilisateur stockée". |
| Salles cliquables via un catalogue statique (`src/data/locaux.js`) | Les salles scrapées sont préfixées par bâtiment (`CAD-A150`, `Le 54-210`) ; le préfixe indique quelle carte Mappedin utiliser, le reste est le code de local dans cette carte. Catalogue à la main (fourni par l'utilisateur), pas d'API publique pour ces cartes. |

## État d'avancement

### Fait et vérifié

- Scraper Puppeteer (`src/services/scraper.js`) : sélection de groupe,
  bascule vue liste, extraction structurée, gestion du fuseau horaire,
  navigation semaine précédente/courante/suivante (`weekOffset` -1/0/1).
  Vérifié avec plusieurs groupes HEAJ réels.
- Cache partagé par (groupe, semaine) avec TTL (`src/services/cache.js`).
- Catalogue statique programme/groupe (`src/data/filieres.js`) et
  autocomplétion locale (`src/utils/groupOptions.js`), sans aucune requête
  serveur pour le menu déroulant.
- Commandes (anglais) : `/today`, `/tomorrow`, `/week`, `/date`, `/next`
  (bascule sur la semaine suivante si plus rien cette semaine), `/help`,
  `/admin refresh|refresh-all|set-url|maintenance|status` (réservé via
  `ADMIN_DISCORD_ID`, RG-07).
- Panneau admin (`/admin status`) : embed de statut + 3 boutons (Refresh
  all, Change URL, bascule maintenance). "Change URL" ouvre une modale
  Discord (Discord ne permet pas de saisie de texte directement sur un
  bouton). Gérés dans `src/commands/admin.js`
  (`handleButton`/`handleModalSubmit`), dispatchés depuis `index.js` sur
  `interaction.isButton()`/`isModalSubmit()`.
- Mode maintenance (`src/services/config.js`, persisté) : bloque toute
  commande hors `/admin` pour qui n'est pas l'administrateur, vérifié dans
  `index.js` avant `command.execute()`.
- Options `public` (réponse visible par tous), `format` (`list`/`grid`),
  `hide_cancelled`, `option` (filtre par sous-groupe/spécialisation, ex:
  "Game Art" — garde aussi les cours communs, masque les autres
  sous-groupes ; autocomplétion best-effort depuis le cache) sur les
  commandes de consultation.
- Embeds conformes au §4.3 (titre, une ligne par cours, séparateur par
  jour, pied de page horodaté, répartition automatique au-delà de 25
  champs/6000 caractères pour le format liste).
- Salles cliquables en format liste (`linkifyRoom` dans `embeds.js` +
  `src/data/locaux.js`) : reconnaît le préfixe de bâtiment (`CAD-`,
  `Le 54-`) d'une salle scrapée et la transforme en lien Markdown vers sa
  carte Mappedin ; salle inconnue ou format grid (dans un bloc de code,
  Markdown désactivé) → texte brut inchangé. Vérifié avec des salles
  scrapées réelles (simples et combinées, ex: `CAD-B236 / CAD-C-43`).
- Commandes de consultation installables en DM, groupe privé, et serveur
  (V1.1) ; `/admin` reste restreint à l'installation utilisateur et aux
  contextes DM + groupe privé.
- Aucune donnée utilisateur persistée (pas de fichier, pas de base de
  données liant un compte Discord à un groupe). Seule exception : une
  config admin globale (URL de l'Espace Invité de l'année en cours, voir
  ci-dessus), pas liée à un utilisateur.

### Limitations connues

- **Semaine précédente/courante/suivante uniquement** (`weekOffset`
  -1/0/1) — voir investigation détaillée ci-dessus pour pourquoi une
  semaine plus lointaine n'est pas atteignable.
- **Catalogue programme/groupe potentiellement incomplet** — assemblé à la
  main, pas d'énumération automatique (voir plus haut). À compléter
  manuellement dans `src/data/filieres.js` si un groupe manque.
- **Autocomplétion de `option` best-effort** — elle lit le cache du groupe
  déjà sélectionné (`peekCached`, jamais de scraping synchrone dans
  l'autocomplétion elle-même, pour respecter les 3s impartis par Discord).
  Si le groupe n'a pas été consulté récemment, le cache est froid et
  aucune suggestion n'apparaît ("Aucune option ne correspond à ta
  recherche") — **ce n'est pas une erreur** : l'utilisateur peut quand
  même taper le nom de l'option librement, le filtrage fonctionne à
  l'exécution de la commande indépendamment de l'autocomplétion.

  Pour réduire la fréquence de ce cas, l'autocomplétion de `group`
  déclenche un préchauffage du cache en arrière-plan (`warmCache`, jamais
  attendu, ne bloque jamais la réponse à Discord) dès qu'une seule classe
  correspond encore à la saisie — le scraping tourne pendant que
  l'utilisateur continue de remplir la commande. Mesuré : ~7s pour un
  scraping à froid (inclut le lancement de Puppeteer), mais nettement plus
  rapide une fois le navigateur du bot déjà chaud (cas normal en
  production, un seul lancement par redémarrage du bot). N'élimine donc
  pas complètement le cas "cache froid", surtout juste après un
  redémarrage du bot ou pour un groupe jamais consulté depuis longtemps.
- **Modification de cours (hors annulation) non détectée** — seule
  l'annulation a un marqueur texte identifié ("Annulé") dans la vue liste.
### Bug corrigé : colonnes et jours mal alignés pour les groupes à options

Une fausse piste a d'abord été suivie (voir historique du dépôt) en pensant
que les sous-groupes "Options" (ex: B3GA1, B3GA2, B3GD1, B3GP1, B3TA1 —
spécialisations Jeu Vidéo) étaient des promotions séparées, introuvables
par recherche directe. **C'était un faux problème** : ce sont en réalité
des sous-groupes qui apparaissent DANS la liste de cours du groupe combiné
parent (ex: B3J1, B2J4), pas des codes à rechercher séparément. Deux vrais
bugs de parsing les faisaient disparaître ou mal s'afficher :

1. **Colonnes mal comptées** : le tableau a 6 colonnes
   (`[data-colonne]` 0 à 5 : horaires, matière, enseignant, **sous-groupe**,
   salle, type), pas 5. Le code ne lisait que 0 à 4, donc dès qu'un cours
   avait un sous-groupe (colonne 3 non vide), salle et type se
   retrouvaient décalés d'une position — la salle affichait en fait le
   sous-groupe, et le type affichait la vraie salle.
2. **En-têtes de repli confondus avec de vrais jours** : l'Espace Invité
   réutilise la classe `.Gras` à la fois pour les vrais en-têtes de jour
   ("mardi 22 septembre 2026") ET pour des sous-en-têtes de regroupement
   sans rapport ("2 séances de 13h40 à 17h40", "Non placé"). Le code
   traitait chaque `.Gras` comme un changement de jour, donc les cours qui
   suivaient un de ces faux en-têtes héritaient d'un "jour" invalide et
   étaient silencieusement éliminés au filtrage — observé concrètement :
   les cours du vendredi disparaissaient pour B2J4 alors qu'ils existent
   bien sur le site, précédés d'un en-tête "2 séances de 08h40 à 12h40".

Corrigé dans `src/services/scraper.js` : les 6 colonnes sont lues
correctement (nouveau champ `subgroup` sur chaque événement, affiché
avec 🏷️ dans les embeds), et seuls les `.Gras` correspondant à un vrai
jour de semaine (regex stricte) déclenchent un changement de jour — les
autres sont ignorés, le jour précédent est conservé. Revérifié : B2J4
passe de 5 à 18 événements détectés (dont les 3 du vendredi), B3J1 affiche
correctement ses cours "Options" (B3GA1, B3TA1, etc.) avec leur sous-groupe.

### Reste à faire

- Navigation au-delà de ±1 semaine (voir §"Navigation vers une autre
  semaine" pour la limite technique identifiée).
- Notifications avant cours et détection des changements de planning
  (évolutions "phase 4" du cahier des charges, hors périmètre v1).
- Test en conditions réelles avec plusieurs groupes et sur la durée.
- `/admin refresh-all` peut prendre du temps si beaucoup de groupes sont en
  cache (3 scrapings séquentiels par groupe) — pas de retour de progression
  pendant l'exécution, juste le résumé final.
