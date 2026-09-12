# GALIL

The GALIL company repository: the public marketing **website**, the
**WorkDesk** internal time-tracking / project / budget management app, and
the **WorkDesk Handbook** (its user guide). All three are static, self-contained
HTML — no build step, no server — and deploy together to GitHub Pages.

## Repository layout

```
site/                     Everything published to GitHub Pages.
  index.html               Website — home.
  services.html            Website — what we produce.
  careers.html             Website — open roles + "send us your CV" form.
  contact.html             Website — contact form.
  assets/                  Shared CSS/JS for the website + handbook (brand,
                           header/nav, language toggle, mailto form handling).
  app/
    index.html              The WorkDesk app (V7). Self-contained build: React
                           inlined, no network calls. Open it directly in a
                           browser or serve the folder statically.
  handbook/
    index.html              The WorkDesk Handbook — user guide for the app,
                           also linked from the ? button in the app's top bar.
archive/                  Superseded app builds, kept for reference.
  GALIL-WorkDesk-v6.html
  galil-workdesk-dev-cdn-build.html
website-concept/          Original single-page marketing concept. Superseded
                           by site/ (kept for reference).
  index.html
docs/                     Functional spec, auth setup guide, brand assets.
  archive/                 Superseded guides.
site-mui/                 The public website (site/) rebuilt with React +
                           Material UI. Same pages, copy and bilingual
                           EN/Hebrew behaviour, componentized with MUI and
                           Vite. See site-mui/README.md.
materials/                Data exports, backups and an older source reference.
  exports/                 Sample Excel exports (dashboard, time, plan, budgets).
  backups/                 Sample JSON backup/restore files the app can import.
  source-reference/        Pre-V7 JSX source, kept for historical reference only —
                           it does not build the current app.
.github/workflows/        GitHub Pages deployment.
```

## Running it

Nothing here needs a build step or server. Either:

- Open any page directly in a browser (`site/index.html`, `site/app/index.html`,
  `site/handbook/index.html`, …), or
- Serve the `site/` folder with any static file server — this keeps the
  relative links between the website, the app and the handbook working, or
- Push to `main` and let the included workflow publish `site/` to GitHub Pages
  (see **Deployment** below).

## The website (`site/`)

A bilingual (English/Hebrew) marketing site: Home, What we do, Careers and
Contact. The **Careers** page lists open roles (Technical Writer, Instructor,
Office Manager) plus three placeholder roles that can be activated later —
see the comment above the placeholder cards in `site/careers.html`. Both the
Careers "didn't find your role? send us your CV" form and the Contact form
are static-site-friendly: they validate in the browser, then hand off to the
visitor's own email client via a `mailto:` link (built by `site/assets/site.js`)
— there's no backend yet, so there's nowhere for a submission to land
server-side.

## The app (`site/app/`)

### Data: fake database, built in

There is no backend yet. The app ships with a seeded, in-memory database
(`seed()` in `site/app/index.html`) covering users, teams, clients, projects,
work orders, budgets, tasks, assignments, expense types and library notes.
On every change the whole database is written to the browser's
`localStorage`, so a signed-in user's data persists across reloads on that
device/browser — but it is **not shared between users or devices**. Each
visitor effectively gets their own sandboxed copy of the fake company.

Use **⚙ Lists & data administration → Backup & restore** in the app to
export/import that data as JSON (see `materials/backups/` for samples) if you
want to move a demo session between browsers.

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

A workflow at `.github/workflows/deploy-pages.yml` publishes `site/` to
GitHub Pages on every push to `main`. One manual, one-time step is required
before it will run successfully: in the repo's **Settings → Pages**, set
**Source** to **GitHub Actions**. After that, every push to `main` that
touches `site/` redeploys automatically, and the workflow can also be run by
hand from the **Actions** tab. Once deployed, the website is at the Pages
root, the app is at `/app/`, and the handbook is at `/handbook/`.

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
`docs/GALIL-WorkDesk-Functional-Specification-V7.docx` for the fuller spec.
