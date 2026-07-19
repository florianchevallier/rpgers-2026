# RPGers 2026 — Analyse technique du site officiel & recommandations pour le clone

> Analyse réalisée via reverse-engineering du site officiel (https://rpgers.gobelin-tech.online, connecté avec le compte LePaladin) et lecture du code source de votre clone 2024 (React Router v7 / Firebase). Aucune action destructive n'a été effectuée sur le site officiel (2 tentatives de login invalides pour tester l'énumération d'utilisateurs, aucune tablée créée, aucune donnée modifiée).

## 1. Ce qui a changé cette année

Le site officiel 2026 n'a **plus rien à voir** avec la version 2024 :

|                     | 2024 (votre ancien clone)                   | 2026 (site officiel actuel)                                                                                                |
|---------------------|---------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| Framework           | React Router v7 (ex-Remix)                  | **Next.js App Router** (React Server Components)                                                                           |
| Auth                | Firebase Auth (REST, tokens Google)         | **JWT maison** (cookie HttpOnly `rpgers_2026_session`)                                                                     |
| Données             | Firestore (public) + MySQL/Prisma (favoris) | **Base relationnelle propre** (SQL, probablement Postgres/MySQL via un ORM type Prisma) exposée par des routes API Next.js |
| Nom de code interne | —                                           | `Critiquest` (visible dans la navbar : "⚔ Critiquest - {pseudo}")                                                          |

Bonne nouvelle : l'architecture 2026 est **beaucoup plus simple à cloner** que 2024 — c'est une API REST classique derrière un cookie JWT, pas un système Firebase avec refresh token à gérer.

---

## 2. Authentification

### Inscription
```
POST /api/auth/register
Content-Type: application/json

{ "pseudo": "TonPseudo", "email": "optionnel@ex.fr", "password": "min 6 car.", "isAdult": true|false }
```
- Pseudo : lettres/chiffres/`_`/`-` uniquement, filtré par une **liste de mots interdits côté client** (FR + ES + EN, ~400 mots, avec normalisation leet-speak `a→4/@`, etc.) — **ce filtre doit aussi exister côté serveur**, sinon contournable en appelant l'API directement.
- Email optionnel, jamais utilisé pour la connexion (uniquement contact).
- Mot de passe : 6 caractères minimum (faible — à durcir dans le clone).
- `isAdult` déclaratif (auto-déclaration, pas de vérification) → conditionne l'accès aux tablées/labels marqués `isAdult:true`.

### Connexion
```
POST /api/auth/login
{ "pseudo": "LePaladin", "password": "..." }
→ 200 { "success": true, "mustChangePassword": false }
   Set-Cookie: rpgers_2026_session=<JWT>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800 (7 jours)
```
Payload du JWT (HS256) :
```json
{ "userId": 17445, "pseudo": "LePaladin", "isAdmin": false, "isBanned": false, "isAdult": true, "iat":…, "exp":… }
```
- Erreur générique `{"error":"Pseudo ou mot de passe incorrect"}` **identique** que le pseudo existe ou non → **pas de faille d'énumération d'utilisateurs**, bon point.
- Pas de mécanisme de "mot de passe oublié" en ligne : il faut écrire à `contact@rpgers.fr` en précisant son pseudo → **process de recovery manuel, fragile** (aucune vérification d'identité autre que déclarative). À améliorer dans le clone (envoi d'un lien de reset par email si fourni).
- Support d'un flag `mustChangePassword` (changement de mot de passe forcé, ex. après reset admin) → route `/change-password`.

### Déconnexion
```
POST /api/auth/logout
```

### Sécurité de session
- Cookie `HttpOnly` + `Secure` + `SameSite=Lax` → protège correctement contre XSS (vol de cookie) et CSRF cross-site basique.
- Pas de header `Content-Security-Policy` ni `Strict-Transport-Security` détecté sur les réponses → **à ajouter** dans le clone (CSP strict, HSTS).
- Aucun header de rate-limiting observé sur `/api/auth/login` — risque de brute force si non limité côté serveur (non testé pour ne pas perturber le site en prod).

---

## 3. Modèle de données (reconstruit à partir des payloads RSC)

### `Table` (tablée de jeu)
```ts
{
  id: number
  titre: string
  description: string
  systemeJeu: string
  ownerId: number
  salleId: number
  startDatetime: DateTime
  endDatetime: DateTime
  maxPlayers: number
  reservedByAdmin: number      // places pré-réservées par le créateur pour des amis
  adminPlaces: number          // places réservées à la tente JDR (staff), toujours 2 par défaut
  statut: "open" | "canceled" | "finished" | …
  createdAt / updatedAt: DateTime
  owner: { id, pseudo }
  salle: { nom, lieu }
  labels: [{ tableId, labelId, label: { id, nom, couleur, isSystem, isAdult } }]
  registrations: [{ userId, statut: "confirmed" | … }]
  _count: { registrations }
  // champs calculés côté serveur (jamais recalculés client) :
  confirmed, placesLibresTotal, placesLibresPubliques,
  estComplete, estPlacesAdminUniquement
}
```

### `Label` (tags de contenu / ambiance)
```ts
{ id, nom, couleur (hex), conflictsWith: number[], isAdult: boolean }
```
25 labels recensés, avec **matrice de conflits** (ex: "PEGI Enfant" est incompatible avec "Gore", "Violence explicite", "Sexisme"…). Cette logique de conflits est vérifiée **côté client** à la création d'une tablée (bloque la soumission si labels incompatibles) — à revalider côté serveur dans le clone.

### `Salle` (salle/table physique)
```ts
{ nom: string, lieu: string }  // ex: "TABLE 14 JACK SPARROW", lieu: "Église, côté accueil"
```

### `User`
```ts
{ id, pseudo, isAdmin, isBanned, isAdult }
```

### `Signalement` (système de tickets de signalement — nouveau, absent en 2024)
```ts
POST /api/signalements
{ type: string, message: string, salleId?: number }
```
Système permettant à un joueur de signaler un problème (comportement, salle, etc.) à l'orga, avec historique consultable (`GET /api/signalements`) et badge de notifications non lues.

### Notifications
```
GET /api/notifications
GET /api/notifications/count[?since=ISO]
POST /api/notifications/mark-read
```
Polling toutes les 2 minutes (`setInterval(…, 120000)`) + re-vérification au retour de focus (`visibilitychange`). **Un simple WebSocket/SSE ferait un clone bien plus réactif et moins gourmand.**

### "Places urgentes" (désistements de dernière minute)
```
GET /api/urgent               → liste de tables avec une place qui vient de se libérer
POST /api/urgent/:id/respond  { reponse: "yes" | "no" }
```
Bannière poussée à tous les joueurs quand une place se libère en urgence (désinscription tardive) — bonne fonctionnalité à garder/améliorer (ex: notif push mobile pendant les 3 jours de convention).

---

## 4. Catalogue des routes API découvertes

| Méthode | Route                                                                                 | Usage                                                                         |
|---------|---------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| POST    | `/api/auth/register`                                                                  | Créer un compte                                                               |
| POST    | `/api/auth/login`                                                                     | Connexion                                                                     |
| POST    | `/api/auth/logout`                                                                    | Déconnexion                                                                   |
| POST    | `/api/tables`                                                                         | Créer une tablée (voir §5)                                                    |
| GET     | `/api/tables/:id` *(implicite, page SSR)*                                             | Détail tablée                                                                 |
| POST    | `/api/tables/:id/register`                                                            | S'inscrire à une tablée (ou inscrire un tiers via `{pseudo}`)                 |
| DELETE  | `/api/tables/:id/register`                                                            | Se désinscrire (ou désinscrire un tiers via `{userId}`)                       |
| GET     | `/api/users/search?q=&excludeIds=&tableId=`                                           | Autocomplete recherche de joueur·euse par pseudo                              |
| POST    | `/api/users/check-overlap`                                                            | Vérifie si un joueur a déjà un créneau qui chevauche (anti-conflit d'horaire) |
| GET     | `/api/salles`                                                                         | Liste des salles                                                              |
| GET     | `/api/signalements` / POST `/api/signalements`                                        | Système de signalement                                                        |
| GET     | `/api/notifications`, `/api/notifications/count`, POST `/api/notifications/mark-read` | Notifications                                                                 |
| GET     | `/api/urgent`, POST `/api/urgent/:id/respond`                                         | Places de dernière minute                                                     |

Pages découvertes : `/`, `/login`, `/register`, `/change-password`, `/tables/new`, `/tables/:id`, `/planning` ("Mes Parties"), `/signalement`, `/faq`, `/admin` (protégée, redirige vers `/` si non-admin).

---

## 5. Point d'attention sécurité le plus important : contrôle d'accès côté serveur à re-vérifier

Le formulaire de création de tablée (`/tables/new`) envoie optionnellement un champ `ownerId` pour permettre à un admin de créer une tablée **au nom d'un autre joueur** :

```js
body: JSON.stringify({ …, ...(V ? { ownerId: V.id } : {}) })
```

Le champ n'apparaît dans l'UI que si la prop `isAdmin` (passée par le serveur) est vraie — **mais rien ne garantit que la route `POST /api/tables` revérifie côté serveur que l'appelant est bien admin avant d'accepter un `ownerId` arbitraire dans le body.** Je n'ai pas testé cela en direct (cela créerait une vraie tablée sur le site de production utilisé par de vrais joueurs pour l'évènement d'août). **Recommandation pour votre clone : ne jamais faire confiance à un flag d'autorisation venant du client — toujours revérifier `isAdmin` depuis la session serveur avant d'honorer un champ sensible comme `ownerId`.** C'est le genre de bug IDOR/privilege-escalation classique à éviter dès la conception.

Autres points :
- Filtre anti-injures : uniquement côté client actuellement observable → doit être dupliqué côté serveur.
- Pas de CSP/HSTS observés → à ajouter.
- Recovery de mot de passe 100% manuel par email → prévoir un vrai flow de reset token si vous avez les emails.

---

## 6. Fonctionnalités à retenir de votre clone 2024 (à garder/améliorer)

D'après `rpgers-2024/CLAUDE.md` et le code :
- **Filtres multi-critères puissants** : places libres, date, mécaniques, horaires, labels, MJ, favoris — avec logique ET sur les labels, exclusions (labels/mécaniques/MJ exclus), synchronisation URL.
- **Recherche floue (Fuse.js)** sur titre/description/joueurs/MJ, seuil 0.3.
- **Détection de conflits d'horaires** (`hideConflicting`) — le site 2026 a une version serveur de cette logique (`check-overlap`), à harmoniser.
- **Favoris entre joueurs** (Prisma/MySQL, indépendant de la donnée d'event) — absent du site 2026 actuel, feature sympa à réintroduire dans le clone.
- **Dark mode** (next-themes), **labels cliquables** filtrants directement depuis une fiche tablée.
- Le site 2026 introduit en plus : **signalements**, **notifications**, **places urgentes** — trois fonctionnalités utiles à reprendre.

---

## 7. Recommandations pour le clone 2026

**Stack** : étant donné que le site officiel expose une API JSON propre (JWT cookie + routes REST), le clone peut être un simple **client** qui consomme cette même API avec votre propre compte, exactement comme faisait le clone 2024 avec Firebase — pas besoin de dupliquer la base de données des tablées, seulement de la lire/écrire via l'API officielle et d'ajouter votre propre couche (UI, filtres, favoris, cache).

- **Performance** : le site officiel fait du SSR Next.js classique (pas de streaming apparent, HTML de ~380 Ko sur la home avec 104 tablées) → un clone qui ne charge que les données nécessaires (pagination, filtrage serveur plutôt que tout charger puis filtrer côté client comme semble le faire 2024) sera nettement plus rapide en conditions réelles de convention (wifi de salle des fêtes, mobile).
- **Temps réel** : remplacer le polling 2 min des notifications et des "places urgentes" par un **SSE ou WebSocket léger** — critique pendant les 3 jours où les désistements de dernière minute sont l'usage le plus "vital" du site.
- **Offline-first / cache agressif** : les données de labels/salles/MJ changent rarement une fois l'évènement lancé → à mettre en cache local (IndexedDB/localStorage) avec invalidation courte, pour rester utilisable même en cas de wifi capricieux.
- **Favoris** + **filtres avancés** de votre version 2024 à réintégrer, qui n'existent pas (ou plus) sur le site officiel.
- **Ne pas dupliquer le flag d'admin/permissions côté client sans revérification serveur** (cf §5) si vous ajoutez des fonctionnalités similaires (ex: proposer une tablée pour quelqu'un d'autre).

---

## 8. Fichiers de preuve conservés (session locale)
- `/tmp/rsc_payload.txt` — dump décodé des données RSC de la page d'accueil (104 tablées, labels, salles, MJ).
- `/tmp/rpg_js/*.js` — chunks JS téléchargés contenant la logique métier (login, register, création de tablée, inscriptions, signalements).
- `/tmp/rpg_cookies.txt` — cookie de session utilisé pour les tests (à supprimer si vous ne voulez pas le garder qui traîne).
