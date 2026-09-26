# HEAJ Schedule Bot

Bot Discord permettant aux étudiant·e·s de la HEAJ de consulter un horaire
directement en message privé, sans passer par le site — et **sans qu'aucune
donnée ne soit jamais stockée** (voir [SPECIFICATION.md](SPECIFICATION.md)
pour le détail des choix et limitations).

## Comment ça marche

L'horaire est publié en accès libre sur l'Espace Invité HyperPlanning/PRONOTE
Campus (`https://heaj2627.hyperplanning.fr/hp/invite`) — **aucune
authentification n'est requise, aucun mot de passe n'est jamais demandé**.
Le bot pilote un navigateur headless (Puppeteer) pour sélectionner un groupe
et lire son horaire, exactement comme le ferait une personne visitant la
page.

**Aucune donnée utilisateur n'est mémorisée** : ni base de données, ni
fichier, ni préférence liée à ton compte Discord. Chaque commande demande
explicitement un programme et un groupe (via deux menus déroulants). Le
seul lien entre toi et le bot est celui que Discord gère lui-même
(l'installation de l'application sur ton compte). Seule exception : une
config admin globale (l'URL de l'Espace Invité en cours), pas liée à un
utilisateur — voir plus bas.

Le bot fonctionne **uniquement en message privé et en groupe privé**
(application installable par utilisateur — il n'est jamais ajouté à un
serveur Discord).

## Prérequis

- Node.js 20+
- Une application Discord (Developer Portal) avec un bot créé

## Installation

```bash
npm install
cp .env.example .env
# puis renseigner DISCORD_TOKEN, DISCORD_CLIENT_ID (et ADMIN_DISCORD_ID) dans .env
```

## Déployer les commandes slash

```bash
npm run deploy-commands
```

(déploiement global — nécessaire pour une application installable par
utilisateur ; peut prendre jusqu'à 1h pour apparaître partout)

## Lancer le bot

```bash
npm start
```

Puis installe l'application sur ton propre compte Discord (Developer Portal
→ ton app → onglet **Installation** → active **User Install**, puis utilise
le lien d'installation généré), et utilise les commandes en message privé
ou en groupe privé avec le bot.

## Commandes

Toutes les commandes de consultation demandent deux menus déroulants —
**program** (filière) puis **group** (groupe précis, autocomplété une fois
le programme choisi) — puisqu'aucune préférence n'est enregistrée.

| Commande | Fonction |
| --- | --- |
| `/today` | Cours du jour |
| `/tomorrow` | Cours du lendemain (jour civil suivant, samedi inclus si des cours y sont prévus) |
| `/week` | Cours de la semaine (précédente/courante/suivante uniquement) |
| `/date date:DD/MM/YYYY` | Cours d'une date précise (précédente/courante/suivante uniquement) |
| `/next` | Prochain cours à venir (regarde la semaine suivante si celle-ci est terminée) |
| `/help` | Liste des commandes |
| `/admin refresh group:<code>` | Rafraîchir le cache d'un groupe (3 semaines) (réservé à `ADMIN_DISCORD_ID`) |
| `/admin refresh-all` | Rafraîchir tous les groupes déjà consultés (réservé) |
| `/admin set-url url:<...>` | Changer l'URL de l'Espace Invité (change chaque année scolaire) et vider le cache (réservé) |
| `/admin maintenance enabled:<true/false>` | Activer/désactiver le mode maintenance (réservé) |
| `/admin status` | État du bot + panneau de boutons (réservé) |

`/admin status` affiche aussi un **panneau de boutons** (Refresh all,
Change URL, Enable/Disable maintenance) pour ne pas avoir à retaper les
sous-commandes à chaque fois. Le bouton "Change URL" ouvre une petite
fenêtre (modale Discord) pour saisir la nouvelle URL, Discord ne permettant
pas de texte libre directement sur un bouton.

Quand le **mode maintenance** est actif, toute commande autre que `/admin`
répond "🔧 The bot is currently under maintenance" pour tout le monde sauf
l'administrateur (qui garde un accès complet pour le désactiver).

Options supplémentaires sur la plupart des commandes :

- `option` — ne garde que les cours communs à tout le groupe + ceux d'un
  sous-groupe/option précis (ex: `Game Art`), masque les autres options
  (ex: Programmation, Tech Art). Autocomplétion best-effort depuis le
  cache (si le groupe a déjà été consulté récemment) ; sinon, saisie
  libre — le filtrage fonctionne quand même.
- `public` — affiche la réponse pour tout le monde dans la conversation
  (par défaut, seul toi la vois).
- `format` — `list` (détaillée, par défaut) ou `grid` (tableau compact). En
  format `list`, les salles reconnues (`src/data/locaux.js`) sont des liens
  cliquables vers leur carte interactive (Mappedin).
- `hide_cancelled` — masque les cours annulés.

## Catalogue programmes/groupes

Le menu déroulant "program" et l'autocomplétion "group" viennent d'un
catalogue statique (`src/data/filieres.js`), assemblé à la main — pas d'une
énumération automatique du serveur (voir SPECIFICATION.md pour pourquoi).
S'il manque un groupe, ajoute-le directement dans ce fichier.

## Cache

Les horaires scrapés sont mis en cache **par groupe** (donnée publique,
sans lien avec un utilisateur) pendant `CACHE_TTL_MINUTES` (10 min par
défaut), pour limiter la charge sur le serveur HEAJ.

## Limitation connue

Cette version peut afficher la **semaine précédente, courante ou suivante**
uniquement (pas plus loin). Voir SPECIFICATION.md pour le détail technique
de cette limite.

## URL de l'Espace Invité (change chaque année)

L'adresse de l'Espace Invité change de nom chaque année scolaire (ex:
`heaj2627` → `heaj2728` à la rentrée suivante). Pas besoin de modifier le
code : utilise `/admin set-url url:https://heaj2728.hyperplanning.fr/hp/invite`
(remplace le vieux lien). Le changement est persisté (`data/config.json`,
survit aux redémarrages) et vide automatiquement le cache.

## Permissions Discord

Application installable par utilisateur, utilisable en message privé et en
groupe privé — jamais dans un serveur, aucune permission de serveur requise.
