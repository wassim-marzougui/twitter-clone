# Twitter Clone — Alternative à X

Projet universitaire réalisé dans le cadre du cours **Applications Web et Sécurité**  
Université Paris-Saclay — UVSQ — UFR des Sciences  
Module : MIN17217

---

## Description

Application web de type réseau social (clone de Twitter) développée en **Node.js / Express**.  
Le serveur expose uniquement une **API REST JSON** — aucun rendu HTML n'est effectué côté serveur.  
Tout le rendu est réalisé **côté client** via l'API DOM JavaScript.

---

## Fonctionnalités

### Fonctionnalités de base
- Création de compte utilisateur
- Connexion / Déconnexion
- Publication de messages (tweets)
- Affichage de tous les messages du plus récent au plus ancien

### Modules optionnels implémentés (4/7)
| Module | Description |
|---|---|
| Sessions | Remplacement du mot de passe en localStorage par un session ID sécurisé |
| HTTPS | Chiffrement TLS via certificat auto-signé (Node.js natif) |
| Scroll infini | Chargement dynamique des messages au scroll |
| Rafraîchissement automatique | Mise à jour du feed toutes les 5 secondes |

---

## Architecture
twitter-clone/
├── server.js        # Serveur Express — routes API JSON
├── db.js            # Connexion SQLite + création des tables
├── package.json
├── cert/            # Certificats TLS (auto-signés, non versionnés)
│   ├── key.pem
│   └── cert.pem
└── pub/             # Fichiers statiques servis au client
├── index.html   # Page HTML quasi-vide (point d'entrée)
├── client.js    # Toute la logique frontend (DOM, fetch, sessions)
└── client.css   # Styles de l'interface


### Schéma base de données

**Table `users`**
| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant auto-incrémenté |
| username | TEXT UNIQUE | Nom d'utilisateur |
| password | TEXT | Mot de passe hashé (bcrypt) |

**Table `messages`**
| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant auto-incrémenté |
| author | TEXT | Nom de l'auteur |
| content | TEXT | Contenu du message |
| date | TEXT | Date ISO 8601 |

**Table `sessions`**
| Colonne | Type | Description |
|---|---|---|
| id | TEXT PK | UUID de session (crypto.randomUUID) |
| username | TEXT | Utilisateur associé |
| created | TEXT | Date de création ISO 8601 |

---

## API du serveur

### Routes statiques
| Route | Description |
|---|---|
| `GET /` | Page HTML principale |
| `GET /pub/client.js` | Code JavaScript client |
| `GET /pub/client.css` | Feuille de styles |

### Routes JSON
| Méthode | Route | Corps | Réponse | Description |
|---|---|---|---|---|
| POST | `/signin` | `{ username, password }` | `{ ok }` | Créer un compte |
| POST | `/login` | `{ username, password }` | `{ ok, sessionId, username }` | Connexion |
| GET | `/messages` | `?limit=&offset=` | `[ { id, author, content, date } ]` | Liste des messages |
| POST | `/post` | `{ sessionId, content }` | `{ ok }` | Publier un message |

---

## Sécurité

### Protection contre les injections SQL
Toutes les requêtes utilisent des **requêtes préparées** avec `better-sqlite3`.  
Les paramètres utilisateur ne sont jamais concaténés dans les chaînes SQL.

```js
// Exemple de requête préparée
db.prepare('SELECT * FROM users WHERE username = ?').get(username);
```

### Protection contre XSS
Le rendu côté client utilise exclusivement `textContent` pour insérer  
les données utilisateur — jamais `innerHTML`.

```js
// Sûr — textContent échappe automatiquement le HTML
content.textContent = msg.content;
```

### Hashage des mots de passe
Les mots de passe sont hashés avec **bcrypt** (coût 10) avant stockage.  
Jamais stockés en clair dans la base de données.

```js
const hash = await bcrypt.hash(password, 10);
```

### Authentification par session
Après connexion, le serveur génère un **UUID cryptographiquement sûr**  
(`crypto.randomUUID()`) stocké en base. Le mot de passe n'est jamais  
conservé côté client — seul le session ID est stocké dans le `localStorage`.

### HTTPS / TLS
Le serveur Node.js est configuré avec un certificat TLS (auto-signé en  
développement). Toutes les communications sont chiffrées. Le port HTTP  
(3000) redirige automatiquement vers HTTPS (3443).

---

## Stack technique

| Technologie | Usage |
|---|---|
| Node.js v18 | Runtime serveur |
| Express 4 | Framework web — routing, middlewares |
| better-sqlite3 | Base de données SQLite synchrone |
| bcrypt | Hashage des mots de passe |
| crypto (natif) | Génération des session IDs (UUID) |
| https (natif) | Serveur TLS |
| Fetch API | Requêtes AJAX côté client |
| API DOM | Rendu HTML côté client |

---

## Installation et lancement

### Prérequis
- Node.js >= 18
- npm
- openssl (pour générer le certificat)

### Installation

```bash
git clone https://github.com/TON_USERNAME/twitter-clone.git
cd twitter-clone
npm install
```

### Générer le certificat TLS

```bash
mkdir cert
openssl req -x509 -newkey rsa:2048 \
  -keyout cert/key.pem \
  -out cert/cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

### Lancer en local

```bash
node server.js
```

Accès :
- HTTPS : `https://localhost:3443` ← interface principale
- HTTP : `http://localhost:3000` ← redirige automatiquement vers HTTPS

> Le navigateur affichera un avertissement de sécurité pour le certificat  
> auto-signé. Cliquer sur "Avancé" puis "Continuer quand même".

### Lancer en production (Render)

Le port est automatiquement fourni par la variable d'environnement `PORT`.  
HTTPS est géré par l'infrastructure Render — le certificat auto-signé  
n'est pas nécessaire en production.

```bash
npm start
```

---

## Démo en ligne

URL : `https://twitter-clone-xxxx.onrender.com`

> Note : le plan gratuit Render met le serveur en veille après 15 minutes  
> d'inactivité. La première requête peut prendre 30 à 60 secondes.

---

## Choix techniques justifiés

**Pourquoi `better-sqlite3` plutôt qu'un ORM (Knex, Sequelize) ?**  
Le projet ne comporte que 4 requêtes simples. Un ORM ajouterait une  
dépendance inutile et une couche d'abstraction non justifiée pour  
cette échelle. `better-sqlite3` est synchrone, ce qui simplifie  
le code des routes Express.

**Pourquoi l'API DOM plutôt que Nunjucks côté client ?**  
L'API DOM native évite le chargement d'une bibliothèque externe  
et offre un contrôle total sur la construction du HTML, notamment  
pour la protection XSS via `textContent`.

**Pourquoi stocker le session ID plutôt que le mot de passe ?**  
Stocker le mot de passe en clair dans le `localStorage` est une  
mauvaise pratique de sécurité. En cas de XSS, l'attaquant récupérerait  
le mot de passe permanent de l'utilisateur. Le session ID est un token  
temporaire révocable côté serveur.

---

## Auteur

**Wassim**  
Master 1 — Sécurité des Systèmes d'Information : Secrets
Université Paris Saclay  
Année universitaire 2025-2026
