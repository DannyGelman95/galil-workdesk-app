# GALIL WorkDesk

Internal time-tracking, project and budget management app for GALIL Technical
Communications.

## Repository layout

```
public/                  The live app (V7). Deployed as-is to GitHub Pages.
  index.html              Self-contained build: React inlined, no network calls,
                           no build step. Open it directly in a browser or serve
                           the folder statically.
archive/                  Superseded builds, kept for reference.
  GALIL-WorkDesk-v6.html
  galil-workdesk-dev-cdn-build.html
website-concept/          Public marketing site concept (separate product from the app).
  index.html
docs/                     Functional spec, auth setup guide, brand assets.
  archive/                 Superseded guides.
materials/                Data exports, backups and an older source reference.
  exports/                 Sample Excel exports (dashboard, time, plan, budgets).
  backups/                 Sample JSON backup/restore files the app can import.
  source-reference/        Pre-V7 JSX source, kept for historical reference only —
                           it does not build the current app.
.github/workflows/        GitHub Pages deployment.
```

## Running it

The app needs no build step or server. Either:

- Open `public/index.html` directly in a browser, or
- Serve the `public/` folder with any static file server, or
- Push to `main` and let the included workflow publish it to GitHub Pages
  (see **Deployment** below).

## Data: fake database, built in

There is no backend yet. The app ships with a seeded, in-memory database
(`seed()` in `public/index.html`) covering users, teams, clients, projects,
work orders, budgets, tasks, assignments, expense types and library notes.
On every change the whole database is written to the browser's
`localStorage`, so a signed-in user's data persists across reloads on that
device/browser — but it is **not shared between users or devices**. Each
visitor effectively gets their own sandboxed copy of the fake company.

Use **Settings → Backup & restore** in the app to export/import that data as
JSON (see `materials/backups/` for samples) if you want to move a demo
session between browsers.

## Logging in

Sign-in enforces the `@galiltc.co.il` domain and offers two paths — a real
password form, and a simulated "Sign in with Microsoft" account picker (no
real Microsoft/Entra call is made yet; see **Roadmap**).

Demo accounts — password for all of them is `GalilWorkdesk1`:

| Email | Role |
|---|---|
| dana.galil@galiltc.co.il | CEO |
| ronen.shaked@galiltc.co.il | Operations Manager |
| maya.ben.ari@galiltc.co.il | Project Manager |
| eitan.levi@galiltc.co.il | Team Lead |
| noa.katz@galiltc.co.il | Senior Technical Writer |
| yossi.mizrahi@galiltc.co.il | Technical Writer |
| tal.rosen@galiltc.co.il | Trainer |
| orit.hadad@galiltc.co.il | Finance Controller |
| adam.peled@galiltc.co.il | External Contractor |
| gil.avrahami@galiltc.co.il | Board Observer |

The sign-in screen itself also shows these credentials.

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` publishes `public/` to
GitHub Pages on every push to `main`. One manual, one-time step is required
before it will run successfully: in the repo's **Settings → Pages**, set
**Source** to **GitHub Actions**. After that, every push to `main` that
touches `public/` redeploys automatically, and the workflow can also be run
by hand from the **Actions** tab.

## Roadmap — replacing the fake database

The app is intentionally structured so the fake database and simulated
Microsoft sign-in can be swapped for real services without a rewrite:

1. **Database**: replace the `localStorage`-backed store (search
   `localStorage` in `public/index.html`) with a Supabase-backed one —
   same shape (`db.users`, `db.projects`, `db.tasks`, …), same seed
   structure, but persisted centrally and shared across users/devices.
2. **Auth**: replace the simulated Microsoft account picker in `SignIn`
   with real Microsoft Entra ID sign-in (OAuth/OIDC), restricted to
   `@galiltc.co.il` accounts, keeping the existing role model
   (CEO/OPS/PM/TL/SEN/EMP/FIN/EXT/VIEW).

See `docs/GALIL-WorkDesk-Authentication-Setup-Guide.docx` and
`docs/GALIL-WorkDesk-Functional-Specification-V7.docx` for the fuller spec.
