# GALIL WorkDesk

A single-page web app for tracking work hours, plans, and budgets for GALIL, plus the
supporting documentation and data files used to run it.

## Folder contents

- [`GALIL-WorkDesk.html`](GALIL-WorkDesk.html) / [`GALIL-WorkDesk-V7.html`](GALIL-WorkDesk-V7.html) —
  standalone builds of the app (open directly in a browser, no build step required).
- [`Website/`](Website) — the app's local/dev HTML build and the public website concept page.
- [`Files & Materials/`](Files%20&%20Materials) — the React source (`galil-workdesk.jsx`), sample and
  backup data (`.json`), and generated Excel exports (`.xlsx`).
- [`Documentation/`](Documentation) — functional spec, authentication setup guide, brand refresh
  options, and older versions of the user/implementation guides under `Old Files/`.

## Running the app

Open one of the `GALIL-WorkDesk*.html` files directly in a browser — the app is self-contained
and stores its data locally (see the `KEY` constant in `galil-workdesk.jsx`), so no server or
build step is needed.
# GALIL

The GALIL company repository: the public marketing **website**, the
**WorkDesk** internal time-tracking / project / budget management app, and
the **WorkDesk Handbook** (its user guide). The website is a React +
Material UI app (`site-mui/`); the app and handbook are static,
self-contained HTML with no build step. All three deploy together to
GitHub Pages.

## Repository layout

```
site-mui/                 The public website — React + Vite + Material UI.
                           Home, What we do, Careers, Contact, bilingual
                           EN/Hebrew with RTL support. Built in CI and
                           published at the Pages root. See site-mui/README.md.
site/                     The other two products published to GitHub Pages
                           (carried into the deploy as-is, unrelated to the
                           site-mui build).
  app/
    index.html              The WorkDesk app (V7.1). Self-contained build: React
                           inlined, no network calls. Open it directly in a
                           browser or serve the folder statically.
  handbook/
    index.html              The WorkDesk Handbook — user guide for the app,
                           also linked from the ? button in the app's top bar.
archive/                  Superseded builds, kept for reference.
  GALIL-WorkDesk-v6.html
  galil-workdesk-dev-cdn-build.html
  galil-website-static-v1/  The original static HTML/CSS/JS website
                           (index/services/careers/contact.html + assets/),
                           superseded by site-mui/.
website-concept/          Original single-page marketing concept. Superseded
                           by the website above (kept for reference).
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

- **Website** (`site-mui/`): `cd site-mui && npm install && npm run dev`
  (or `npm run build` for a production build — see `site-mui/README.md`).
- **App and handbook**: no build step needed — open `site/app/index.html` or
  `site/handbook/index.html` directly in a browser, or serve `site/` with any
  static file server.
- Push to `main` and let the included workflow build and publish everything
  to GitHub Pages (see **Deployment** below).

## The website (`site-mui/`)

A bilingual (English/Hebrew, RTL) marketing site — Home, What we do, Careers
and Contact — built with React, Vite and Material UI. The **Careers** page
lists open roles (Technical Writer, Instructor, Office Manager) plus three
placeholder roles that can be activated later (see `ROLES`/`PLACEHOLDER_ROLES`
in `site-mui/src/pages/Careers.jsx`). Both the Careers "didn't find your
role? send us your CV" form and the Contact form are static-site-friendly:
they validate in the browser, then hand off to the visitor's own email
client via a `mailto:` link (`site-mui/src/lib/useMailtoForm.js`) — there's
no backend yet, so there's nowhere for a submission to land server-side.

See `site-mui/README.md` for the app's structure and stack.

## The app (`site/app/`)

### Data: fake database, built in

There is no backend yet. The app ships with a seeded, in-memory database
(`seed()` in `site/app/index.html`) covering users, teams, clients, projects,
work orders, budgets, tasks, assignments, expense types and library notes.
On every change the whole database is written to the browser's
`localStorage`, so a signed-in user's data persists across reloads on that
device/browser — but it is **not shared between users or devices**. Each
visitor effectively gets their own sandboxed copy of the fake company.

Use **⚙ System administration → Backup & restore** in the app to
export/import that data as JSON (see `materials/backups/` for samples) if you
want to move a demo session between browsers. People, clients, projects, work
orders, assignments, expense types and the verification queue live on the
**Management** tab instead (up to V7 this was the **Budgets** tab); the ⚙
window now holds only company settings, backup & restore, the audit log and a
read-only roles & permissions reference.

### What's new in V7.1

- A third hour type, **Blue · Management**, for Team Leads, Project Managers,
  Operations Managers and the CEO — time spent managing a client's projects
  and tasks, attributed to a client/project but drawn from neither an
  allowance nor a budget.
- Duplicate a time entry to the next day or the next week, and click a work
  order code anywhere in a table to copy it to the clipboard.
- Expense evidence attachments can be replaced or removed in place.
- A light/dark theme switch, applied across the app, the Handbook and the
  GALIL website — each remembers the choice per device.
- A dedicated phone build below 820px width, built around a running timer,
  with its own Time / Plan / Tasks / Expenses / More navigation.

### Logging in

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

### Getting help in the app

The **?** button in the app's top bar, right next to the profile avatar, opens
the WorkDesk Handbook (`site/handbook/index.html`) in a new tab.

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` builds `site-mui` and
publishes it to GitHub Pages on every push to `main`, with `site/app/` and
`site/handbook/` carried over unchanged into the same deploy. One manual,
one-time step is required before it will run successfully: in the repo's
**Settings → Pages**, set **Source** to **GitHub Actions**. After that, every
push to `main` that touches `site-mui/` or `site/` redeploys automatically,
and the workflow can also be run by hand from the **Actions** tab. Once
deployed, the website is at the Pages root, the app is at `/app/`, and the
handbook is at `/handbook/`.

## Roadmap — replacing the fake database

The app is intentionally structured so the fake database and simulated
Microsoft sign-in can be swapped for real services without a rewrite:

1. **Database**: replace the `localStorage`-backed store (search
   `localStorage` in `site/app/index.html`) with a Supabase-backed one —
   same shape (`db.users`, `db.projects`, `db.tasks`, …), same seed
   structure, but persisted centrally and shared across users/devices.
2. **Auth**: replace the simulated Microsoft account picker in `SignIn`
   with real Microsoft Entra ID sign-in (OAuth/OIDC), restricted to
   `@galiltc.co.il` accounts, keeping the existing role model
   (CEO/OPS/PM/TL/SEN/EMP/FIN/EXT/VIEW).
3. **Website forms**: replace the `mailto:` handoff on the Contact and
   Careers/CV forms with a real submission endpoint (email service or ATS)
   once one exists.

See `docs/GALIL-WorkDesk-Authentication-Setup-Guide.docx` and
`docs/GALIL-WorkDesk-Functional-Specification-V7.1.docx` for the fuller spec.
