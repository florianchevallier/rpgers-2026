# RPGers 2026 (« Critiquest ») — Plan technique du clone

> Plan d'implémentation, étape par étape, pour reconstruire un client bien meilleur que le site officiel : **performance, design, et utilité réelle pendant les 3 jours** (14–16 août 2026).
> Rédigé le **19 juillet 2026**. Versions des dépendances vérifiées ce jour sur le registre npm.
> À lire avec `rpgers-2026-analyse.md` (modèle de données, endpoints, sécurité).

---

## 0. Contrainte temporelle (à garder en tête en permanence)

| Repère | Date | Jours restants |
|---|---|---|
| Aujourd'hui | 19 juil. 2026 | — |
| Gel des fonctionnalités (feature freeze) | **9 août 2026** | 21 j |
| **Évènement** | **14 → 16 août 2026** | 26 j |

**Conséquence directe : MVP d'abord, YAGNI strict.** Tout ce qui n'est pas indispensable au jour J passe en « stretch ». Le planning en §9 tranche ce qui est *must-have* vs *nice-to-have*.

---

## 1. Hypothèse d'architecture (à valider avant de coder)

Le clone est un **frontend supérieur posé sur l'API officielle** (`rpgers.gobelin-tech.online`), exactement comme le clone 2024 consommait Firebase. On ne réplique **pas** la base des tablées : on la lit/écrit via l'API officielle, avec ton compte, et on ajoute par-dessus notre propre couche (UI, filtres, favoris, temps réel, offline).

```
┌──────────────┐     ┌───────────────────────────┐     ┌────────────────────────┐
│  Navigateur  │ ──▶ │  Notre app Next.js (BFF)  │ ──▶ │  API officielle RPGers │
│  (React 19)  │ ◀── │  · détient le JWT serveur  │ ◀── │  /api/tables, /login…  │
└──────────────┘     │  · cache + enrichit        │     └────────────────────────┘
                     │  · SSE temps réel          │     ┌────────────────────────┐
                     │  · notre DB (favoris/prefs)│ ──▶ │  Postgres (Prisma) local│
                     └───────────────────────────┘     └────────────────────────┘
```

**Pourquoi un BFF (Backend-For-Frontend) et pas un SPA qui tape l'API en direct ?** Le cookie de session officiel est `HttpOnly` + scoped à `rpgers.gobelin-tech.online` : un front sur un autre domaine ne peut ni le lire ni l'envoyer (CORS + cookie cross-site). La seule architecture propre est un serveur à nous qui s'authentifie, garde le JWT côté serveur, et sert notre UI. C'est aussi ce qui permet le cache, l'enrichissement et le temps réel.

> ⚠️ **Point de bifurcation.** Ce plan suppose que `rpgers.gobelin-tech.online` est bien la **source de vérité** qu'on consomme. Si tu veux au contraire un **rebuild autonome** (base de données à nous, mirroring des données), les phases 1 et 4 changent de nature — dis-le avant de démarrer.

---

## 2. Stack technique cible (versions stables au 19 juil. 2026)

| Domaine | Choix | Version | Pourquoi |
|---|---|---|---|
| Framework | **Next.js** (App Router, Turbopack, Cache Components) | 16.2 | SSR + BFF + PWA dans un seul outil ; miroir du stack officiel |
| UI | **React** | 19.2 | Server Components, `use()`, Actions |
| Langage | **TypeScript** strict | 5.x | Non négociable |
| Styling | **Tailwind CSS v4** (config CSS-first, pas de `tailwind.config.js`) | 4.3 | Rapide, moderne, thème par variables CSS |
| Composants | **shadcn/ui** (Radix, accessible, copié dans le repo) | CLI | Accessibilité + on possède le code |
| Thème sombre | **next-themes** | 0.4+ | Détection système, pas de flash |
| Data client | **TanStack Query v5** | 5.10 | Cache, optimistic updates, invalidation temps réel |
| Validation | **Zod v4** | 4.4 | Valide les réponses de l'API officielle (défensif : leur schéma change chaque année) |
| Filtres URL | **nuqs** | 2.9 | Filtres synchronisés à l'URL, typés (remplace le bricolage 2024) |
| Recherche floue | **Fuse.js** | 7.x | Repris de 2024 (titre/desc/MJ/joueurs) |
| Notre DB | **Prisma v7 + Postgres** (ou SQLite si mono-instance) | 7.8 | Favoris, préférences, presets de filtres, snapshots de cache |
| Temps réel | **SSE** (Server-Sent Events) natif | — | Plus simple qu'un WebSocket, suffisant pour notifs + places urgentes |
| PWA / offline / push | **Serwist** | 9.5 | Successeur de next-pwa ; installable + push (vital pour les désistements) |
| Icônes | **lucide-react** | latest | Cohérent avec shadcn |

**À vérifier au moment du `create`** : relancer `npm view <pkg> version` — ces numéros bougent vite.

---

## 3. Outillage & DX (la partie que tu tiens à avoir « parfaite »)

### 3.1 Qualité de code — un seul outil rapide
- **Biome 2.5** remplace ESLint **et** Prettier (lint + format en un binaire Rust, ~ms). Un seul `biome.json`.
- **TypeScript strict** + `tsc --noEmit` en CI et en pre-commit.
- **Lefthook** (git hooks, écrit en Go, plus rapide que Husky) : sur `pre-commit` → `biome check --staged` + `tsc`. Sur `pre-push` → tests unitaires.

```bash
# pre-commit (lefthook.yml)
pre-commit:
  parallel: true
  commands:
    biome:  { run: "npx biome check --write --no-errors-on-unmatched {staged_files}" }
    types:  { run: "npx tsc --noEmit" }
```

### 3.2 Tests
- **Vitest 4** + Testing Library → logique métier (calcul de conflits, filtres, parsing des réponses API).
- **Playwright 1.61** → parcours critiques E2E : login → filtrer → s'inscrire → se désinscrire → « Mes Parties ». C'est le filet de sécurité pour ne rien casser à J-3.
- Objectif réaliste vu le délai : **tester le chemin critique, pas 100 % de couverture.**

### 3.3 DX assistée par Claude Code (ton contexte précis)
| Levier | Usage |
|---|---|
| **Skill `react-doctor`** | À lancer **après chaque lot de changements React** — attrape hooks mal utilisés, effets manquants, problèmes de perf/a11y avant qu'ils ne s'installent. |
| **Skill `frontend-design`** | Au début de la phase design, pour une direction visuelle distinctive (pas un thème « template par défaut »). |
| **Skill `code-review`** | Sur chaque diff non trivial avant commit (`/code-review`, option `--fix`). |
| **Skill `verify`** | Après une fonctionnalité : exerce le vrai flux navigateur→API→données, pas juste les tests. |
| **Skill `tdd`** | Pour la logique pure (détection de conflits d'horaires, matrice de labels) : red-green-refactor. |
| **Skill `claude-md-management`** | Maintenir le `CLAUDE.md` du repo à jour (voir §3.4). |
| **Hooks `.claude/settings.json`** | `PostToolUse` sur Edit/Write → `biome check --write` auto ; `Stop` → rappel `tsc --noEmit`. Automatise ce que tu répètes. |
| **MCP Playwright / Chrome DevTools** | Vérification frontend réelle (layout, réseau, Core Web Vitals) pendant le dev. |
| **MCP Context7** | Docs à jour de Next.js 16 / Tailwind v4 / TanStack Query (évite le code périmé). |
| **Sous-agents** | `frontend-architect` (UI/perf), `performance-engineer` (mesures), `security-engineer` (revue du BFF/auth), `quality-engineer` (stratégie de tests). |
| **Skill `fewer-permission-prompts`** | Une fois le workflow rôdé, allège les prompts de permission sur les commandes read-only. |

### 3.4 `CLAUDE.md` du projet (à créer en Phase 0)
Doit contenir : stack + versions, commandes (`dev`/`build`/`test`/`lint`), forme des réponses de l'API officielle, conventions (BFF ne fait jamais confiance au client, cf. sécurité), et la règle « lance `react-doctor` après changements React ».

### 3.5 CI/CD
- **CI** : GitHub Actions **ou** le `.onedev-buildspec.yml` que tu utilises déjà (2024) → `biome ci` + `tsc` + `vitest run` + `playwright` (sur PR) + `next build`.
- **CD** : image Docker multi-stage, sortie **`output: 'standalone'`** de Next.js, servie derrière ton nginx existant (les en-têtes du site montrent déjà `nginx/1.29.4` self-hosted). Vercel reste une alternative zéro-config si tu veux éviter Docker.

---

## 4. Structure de projet cible

```
rpgers-2026/
├── CLAUDE.md
├── biome.json  lefthook.yml  Dockerfile  docker-compose.yml
├── prisma/schema.prisma            # favoris, prefs, presets, snapshots
├── src/
│   ├── app/
│   │   ├── (auth)/login  register  change-password
│   │   ├── (app)/
│   │   │   ├── page.tsx             # liste des tablées (cœur)
│   │   │   ├── tables/[id]/         # fiche tablée
│   │   │   ├── tables/new/          # proposer une tablée
│   │   │   ├── planning/            # « Mes Parties »
│   │   │   ├── signalement/  faq/
│   │   │   └── layout.tsx           # navbar + bannière urgente + SSE
│   │   └── api/                     # BFF : proxy/enrichissement + SSE + auth
│   ├── server/
│   │   ├── rpgers-client.ts         # client typé de l'API officielle (fetch + Zod)
│   │   ├── auth.ts                  # login officiel, stockage JWT serveur
│   │   └── cache.ts                 # cache mémoire/Redis léger
│   ├── domain/                      # logique pure, testée (conflits, filtres, labels)
│   ├── components/  (ui/ shadcn + métier)
│   ├── hooks/  lib/  types/
│   └── styles/theme.css             # variables Tailwind v4, fonts Cinzel/Crimson Pro
└── tests/e2e/  (Playwright)
```

---

## 5. Phases d'implémentation

### Phase 0 — Fondations & DX (jour 1–2) · *must-have*
**But :** un squelette qui build, lint, teste et se déploie *vide* mais propre — pour ne jamais avoir à revenir en arrière.
- `create-next-app` (App Router, TS, Turbopack) ; Tailwind v4 ; shadcn init ; Biome ; Lefthook ; Vitest ; Playwright ; Prisma.
- `CLAUDE.md`, `.claude/settings.json` (hooks), `biome.json`, `Dockerfile` standalone, pipeline CI minimal.
- **DoD :** `npm run build` + `biome ci` + `tsc` + un test Playwright « la home répond » passent en CI ; image Docker se lance.

### Phase 1 — Couche d'accès à l'API officielle (jour 2–5) · *must-have*
**But :** parler à l'API officielle de façon typée, sûre et cachée.
- `rpgers-client.ts` : fonctions typées pour `login`, `register`, `logout`, `GET tables`, `GET tables/:id`, `POST/DELETE tables/:id/register`, `users/search`, `check-overlap`, `salles`, `urgent`, `notifications`, `signalements`.
- **Schémas Zod** de toutes les réponses (défensif) + parsing des dates `$D…` du format RSC.
- Auth serveur : login officiel → stockage du JWT en session côté BFF (cookie à nous, `HttpOnly`/`Secure`/`SameSite=Lax`) ; refresh transparent (JWT officiel = 7 jours).
- Cache court (labels/salles/MJ = quasi statiques pendant l'évènement).
- **Sécurité (leçon de l'analyse §5) :** le BFF **revérifie toujours les autorisations côté serveur** ; ne jamais propager un flag `isAdmin`/`ownerId` venu du client sans contrôle. Filtre anti-injures **aussi côté serveur**.
- **DoD :** depuis un script, on se logue et on liste les 104 tablées validées par Zod. `security-engineer` a relu `auth.ts` + le BFF.

### Phase 2 — Design system & layout (jour 4–7) · *must-have*
**But :** une identité visuelle forte (medieval-fantasy assumé) + mobile-first.
- Activer le skill **`frontend-design`** pour la direction artistique. Fonts déjà repérées : **Cinzel** (titres) + **Crimson Pro** (texte).
- Thème via variables CSS Tailwind v4 (couleurs or/rouge/vert des labels), dark mode `next-themes`, composants shadcn de base (Button, Card, Badge, Dialog, Command).
- Navbar (« ⚔ Critiquest »), layout `(app)`, squelette bannière urgente.
- **Mobile-first impératif** : l'usage réel se fait au téléphone, dans une salle des fêtes, en wifi capricieux.
- **DoD :** design tokens en place, dark mode sans flash, `react-doctor` clean, Lighthouse mobile ≥ 90 sur une page vide stylée.

### Phase 3 — Fonctionnalités cœur (jour 6–12) · *must-have*
**But :** tout ce qui permet de vivre l'évènement.
1. **Liste des tablées** — SSR, groupées par jour, cartes (places libres pub/total, labels, MJ, salle, horaire, complet/urgent).
2. **Filtres** (nuqs, synchro URL + persistance locale) : date, label (ET), MJ, places libres, « mes parties », passées. Repris et durci depuis 2024.
3. **Recherche floue** (Fuse.js) titre/desc/MJ/joueurs.
4. **Fiche tablée** — détail, liste des inscrits, boutons **S'inscrire / Se désinscrire** (règle officielle : désinscription bloquée < 1 h avant), pré-inscription d'amis (avec `check-overlap`).
5. **« Mes Parties » / planning** — vue chronologique perso + **détection de conflits d'horaires** (logique pure testée en TDD).
6. **Proposer une tablée** — formulaire multi-étapes (infos → invités → récap), validation labels incompatibles côté client **et** serveur.
- **DoD :** parcours E2E Playwright « login → filtrer → s'inscrire → voir dans planning → se désinscrire » vert. `verify` exécuté sur le flux réel.

### Phase 4 — Utile pendant l'évènement (jour 11–17) · *must-have (temps réel) + stretch (push)*
**But :** le clone doit être **meilleur que l'officiel là où ça compte** : la réactivité aux désistements.
- **Temps réel SSE** : remplace le polling 2 min officiel. Le BFF pousse `notifications` + `places urgentes` ; TanStack Query invalide les données concernées. → *must-have*.
- **Bannière « place urgente »** + réponse `yes/no` (`/api/urgent/:id/respond`). → *must-have*.
- **PWA installable** (Serwist) + **notifications push** Web Push (VAPID) : être alerté d'une place libérée même app fermée. → *stretch, très fort si le temps le permet*.
- **Cache offline** des données quasi-statiques (labels/salles) → utilisable en wifi défaillant. → *stretch*.
- **DoD :** ouvrir 2 onglets, une désinscription dans l'un fait apparaître la place dans l'autre en < 2 s sans refresh.

### Phase 5 — Bonus « clone » hérités de 2024 (jour 15–19) · *nice-to-have*
- **Favoris entre joueurs** (notre Prisma) — absent de l'officiel, feature appréciée.
- **Filtres avancés** : exclusions (labels/MJ), `hideConflicting`, presets sauvegardés.
- **Fiche joueur / stats** légères si le temps le permet.
- **DoD :** favoris persistants, filtres d'exclusion fonctionnels.

### Phase 6 — Perf & polish (jour 18–20) · *must-have (perf de base)*
- Mesures **Core Web Vitals** (Chrome DevTools MCP) : LCP, INP, CLS sur mobile throttlé.
- Pagination / filtrage **côté serveur** plutôt que « tout charger puis filtrer » (défaut de 2024 ; home officielle = 380 Ko).
- `next/image`, découpage du bundle, `Suspense` + streaming, revalidation ciblée.
- Sous-agent **`performance-engineer`** pour la chasse aux régressions.
- **DoD :** Lighthouse mobile ≥ 90 partout ; INP < 200 ms ; première liste utile < 1,5 s en 4G throttlé.

### Phase 7 — Tests, sécurité, déploiement (jour 19–21) · *must-have*
- Compléter la suite Playwright sur les parcours critiques ; skill **`security-review`** sur le diff final (auth, BFF, IDOR, injures serveur, CSP/HSTS).
- **Ajouter les en-têtes manquants de l'officiel** : `Content-Security-Policy` strict, `Strict-Transport-Security`.
- Build Docker standalone → déploiement derrière nginx ; **Sentry self-host** (optionnel) pour les erreurs pendant l'évènement.
- **Runbook** court : comment redéployer/rollback en 2 min si un hotfix est nécessaire les 14–16.
- **DoD :** déployé sur ton domaine, HTTPS, monitoring actif, procédure de rollback testée.

---

## 6. Décisions d'architecture à figer tôt

1. **Notre DB** : Postgres (Prisma 7) si multi-instance ; **SQLite** suffit si mono-conteneur (plus simple à self-host) — recommandé vu l'échelle « amis ».
2. **Où vit le JWT officiel** : en session serveur uniquement, jamais exposé au navigateur.
3. **Stratégie de cache** : `revalidate` court (30–60 s) sur les listes, cache long sur labels/salles, invalidation immédiate via SSE sur les mutations.
4. **Format des dates** : centraliser le parsing du format RSC (`$D2026-08-14T…`) dans le client typé.

---

## 7. Risques & parades

| Risque | Impact | Parade |
|---|---|---|
| L'API officielle change de forme d'ici août | Casse le clone | Schémas **Zod** partout → échec explicite et localisé, pas un écran blanc |
| Rate-limit / blocage côté officiel | Plus de données | Cache agressif + backoff ; ne pas marteler l'API |
| Wifi de la salle défaillant | App inutilisable au pire moment | PWA + cache offline des données statiques |
| Délai trop court | MVP incomplet | Feature freeze **9 août**, priorisation stricte (§9), stretch coupables en premier |
| Régression à J-1 | Panne pendant l'évènement | E2E Playwright sur le chemin critique + rollback Docker 2 min |

---

## 8. Point éthique / légal (rapide)

Consommer l'API officielle avec **ton propre compte**, pour **toi et tes amis**, en lecture + inscriptions normales, reste un usage de client alternatif. À **éviter** : scraping massif des données d'autres joueurs, contournement de permissions (le champ `ownerId` admin repéré en §5), ou charge anormale sur leur serveur. On reste sur les mêmes actions qu'un utilisateur légitime, en mieux présentées.

---

## 9. Planning condensé (26 jours) & priorisation

| Semaine | Dates | Contenu | Priorité |
|---|---|---|---|
| S1 | 19–25 juil | Phase 0 + Phase 1 (fondations, BFF, auth, lecture tablées) | 🔴 must |
| S2 | 26 juil–1 août | Phase 2 + Phase 3 (design system + cœur : liste/filtres/fiche/inscription/planning) | 🔴 must |
| S3 | 2–8 août | Phase 4 (SSE temps réel + urgent) ; début Phase 5/6 | 🔴 temps réel / 🟡 reste |
| S4 | 9–13 août | **Freeze 9/8** → Phase 6 perf + Phase 7 tests/déploiement + buffer | 🔴 must |
| Évènement | 14–16 août | **Hotfix only.** Aucune nouvelle feature. | — |

**MVP incompressible avant le 14 août :** login • liste des tablées • filtres + recherche • fiche + inscription/désinscription • « Mes Parties » + conflits • mobile-first • temps réel des places urgentes • déployé + monitoré.
**Stretch (si le temps le permet) :** push Web/PWA offline • favoris • filtres d'exclusion • stats joueurs.

---

## 10. Première action concrète

```bash
# 1. Scaffold (vérifier la dernière version au moment du run)
npx create-next-app@latest . --typescript --app --turbopack --tailwind --import-alias "@/*"

# 2. Outils DX
npx shadcn@latest init
npm i -D @biomejs/biome lefthook vitest @playwright/test @testing-library/react
npm i @tanstack/react-query zod nuqs next-themes fuse.js lucide-react
npm i -D prisma && npm i @prisma/client
npx biome init && npx lefthook install && npx prisma init --datasource-provider sqlite

# 3. Poser CLAUDE.md + .claude/settings.json (hooks biome/tsc), puis premier commit
```

Ensuite : **Phase 1**, en s'appuyant sur `rpgers-2026-analyse.md` pour typer chaque endpoint.
