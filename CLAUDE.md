# CLAUDE.md — RPGers 2026 (« Critiquest »)

Guide pour Claude Code sur ce dépôt. **Priorité aux instructions de ce fichier.**

> **État actuel (19 juil. 2026) : dépôt en phase de démarrage.** Seuls les documents de conception existent — pas encore de code. Voir `rpgers-2026-plan.md` (plan par phases) et `rpgers-2026-analyse.md` (rétro-ingénierie de l'API officielle). **Ce fichier décrit l'architecture *cible*** ; mets-le à jour au fil du scaffolding.

Voir aussi `AGENTS.md` (notes Next.js générées par le scaffold).

---

## 1. Ce qu'on construit

Un **client alternatif supérieur** au site officiel RPGers (`rpgers.gobelin-tech.online`), privé, pour l'auteur et ses amis, utilisable pendant la convention **14–16 août 2026**. Objectifs : **performance, design, utilité réelle sur 3 jours**.

**Architecture = BFF (Backend-For-Frontend).** Notre app Next.js s'authentifie **côté serveur** contre l'API officielle, détient le JWT, met en cache, enrichit, et sert notre UI. On ne réplique pas la base des tablées — on la lit/écrit via l'API officielle avec le compte de l'utilisateur.

```
Navigateur ──▶ Notre BFF Next.js ──▶ API officielle RPGers
                     │            └──▶ Notre DB (favoris, prefs) via Prisma
                     └──▶ SSE temps réel
```

> ⚠️ **Hypothèse à ne pas casser** : `rpgers.gobelin-tech.online` est la source de vérité qu'on consomme. Un « rebuild autonome » (DB à nous, mirroring) serait une autre architecture — demander avant de dévier.

---

## 2. Stack (versions stables vérifiées le 19 juil. 2026)

Next.js **16.2** (App Router, Turbopack, Cache Components) · React **19.2** · TypeScript strict · Tailwind CSS **v4.3** (config CSS-first, **pas** de `tailwind.config.js`) · shadcn/ui · next-themes · TanStack Query **v5** · Zod **v4** · nuqs **2.9** (filtres URL) · Fuse.js (recherche floue) · Prisma **v7** + SQLite/Postgres · SSE natif (temps réel) · Serwist **9** (PWA/push) · lucide-react.

Toujours revérifier la dernière version au moment d'installer (`npm view <pkg> version`).

---

## 3. Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build prod (sortie `standalone`) |
| `npm run start` | Serveur prod |
| `npx tsc --noEmit` | Vérif types — **toujours après un changement** |
| `npx biome check --write .` | Lint + format (remplace ESLint+Prettier) |
| `npm run test` | Vitest (unitaire) |
| `npm run test:e2e` | Playwright (parcours critiques) |
| `npx prisma migrate dev` / `studio` | DB locale |

---

## 4. Structure cible

```
src/
├── app/(auth)/         # login, register, change-password
├── app/(app)/          # page.tsx (liste), tables/[id], tables/new, planning, signalement, faq
├── app/api/            # BFF : proxy/enrichissement, SSE, auth
├── server/             # rpgers-client.ts (API officielle typée+Zod), auth.ts (JWT serveur), cache.ts
├── domain/             # logique PURE et testée (conflits d'horaires, filtres, matrice de labels)
├── components/         # ui/ (shadcn) + composants métier
├── hooks/  lib/  types/
└── styles/theme.css    # variables Tailwind v4, fonts Cinzel (titres) + Crimson Pro (texte)
tests/e2e/              # Playwright
```

---

## 5. Règles critiques (🔴 non négociables)

1. **Le BFF ne fait JAMAIS confiance au client pour l'autorisation.** Toujours revérifier `isAdmin`/permissions depuis la session serveur avant d'honorer un champ sensible (ex. `ownerId` à la création d'une tablée — faille repérée sur l'officiel, cf. analyse §5).
2. **Toute réponse de l'API officielle passe par un schéma Zod.** Leur schéma change chaque année ; un parse échoue de façon explicite et localisée, pas en écran blanc.
3. **Filtre anti-injures côté serveur** (l'officiel ne le fait que côté client → contournable). Valider aussi la **matrice de conflits de labels** côté serveur.
4. **JWT officiel = côté serveur uniquement**, jamais exposé au navigateur. Notre cookie de session : `HttpOnly` + `Secure` + `SameSite=Lax`.
5. **Ajouter `Content-Security-Policy` strict + `Strict-Transport-Security`** (absents de l'officiel).
6. **Mobile-first impératif** : usage réel = téléphone, wifi de salle des fêtes capricieux.
7. **Feature freeze le 9 août ; 14–16 août = hotfix only.** MVP d'abord, YAGNI strict.

---

## 6. API officielle (référence — détails dans `rpgers-2026-analyse.md`)

Auth cookie JWT `rpgers_2026_session` (HS256, 7 j). Endpoints principaux :

| Méthode | Route | Usage |
|---|---|---|
| POST | `/api/auth/{register,login,logout}` | Auth (`{pseudo,password,...}`) |
| POST/DELETE | `/api/tables/:id/register` | S'inscrire / se désinscrire (désinscription bloquée < 1 h avant) |
| POST | `/api/tables` | Créer une tablée |
| GET | `/api/users/search?q=` | Autocomplete pseudo |
| POST | `/api/users/check-overlap` | Conflit d'horaire d'un joueur |
| GET | `/api/urgent` · POST `/api/urgent/:id/respond` | Places de dernière minute |
| GET | `/api/notifications[/count]` · POST `/api/notifications/mark-read` | Notifications |
| GET/POST | `/api/signalements` · GET `/api/salles` | Signalements, salles |

Entités clés : `Table` (titre, description, systemeJeu, salleId, start/endDatetime, maxPlayers, `adminPlaces`, labels[], registrations[], champs calculés `placesLibres*`), `Label` (`{nom,couleur,conflictsWith[],isAdult}`), `Salle`, `User` (`{pseudo,isAdmin,isBanned,isAdult}`). Dates au format RSC `$D2026-08-14T…` → centraliser le parsing dans `server/rpgers-client.ts`.

---

## 7. Workflow qualité (DX)

- **Après tout changement React** → lancer le skill **`react-doctor`** (hooks, effets, perf, a11y).
- **Design** → skill **`frontend-design`** pour une identité distinctive (medieval-fantasy assumé, pas un thème par défaut).
- **Avant commit d'un diff non trivial** → skill **`code-review`** (`--fix` possible), puis skill **`verify`** sur le vrai flux navigateur→API→données.
- **Logique pure** (conflits, filtres, labels) → skill **`tdd`** (red-green-refactor).
- **Avant déploiement** → skill **`security-review`** sur le diff.
- **Outils** : Biome (lint/format), `tsc` strict, Lefthook (pre-commit: biome+tsc), Vitest, Playwright. MCP Context7 pour les docs Next 16 / Tailwind v4 / TanStack Query à jour.
- **Sous-agents utiles** : `frontend-architect`, `performance-engineer`, `security-engineer`, `quality-engineer`.

---

## 8. Éthique

Usage = client alternatif avec le **compte de l'utilisateur**, actions d'un joueur légitime (lecture, inscriptions), pour un cercle privé. **Éviter** : scraping massif de données d'autres joueurs, contournement de permissions, charge anormale sur le serveur officiel.
