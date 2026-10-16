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
    index.html              The WorkDesk app (V7.2). Self-contained build: React
                           inlined, no network calls. Open it directly in a
                           browser or serve the folder statically.
  handbook/
    index.html              The WorkDesk Handbook — user guide for the app,
                           also linked from the ? button in the app's top bar.
  kb/
    index.html              The Employee Knowledge Base — onboarding, company
                           rules and training how-to's, opened from the
                           book button in the app's top bar.
  taskana/
    index.html              Taskana — Jira-style project & task tracker for
                           the technical-writing teams. Standalone (see
                           "Taskana" below).
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

## Taskana (`site/taskana/`)

Taskana, by GALIL, is a Jira-style project and task tracker built for
technical-writing teams. It is a static app with no build step: open
`site/taskana/index.html` directly or serve the folder. It runs in one of two
modes, set in `site/taskana/config.js`:

- **Standalone demo** (no Entra client ID, the default): sign in like WorkDesk —
  a simulated "Sign in with Microsoft" account picker, or a company email and the
  demo password `GalilTaskana1`. Only `@galiltc.co.il` addresses get in; five wrong
  passwords lock an address for 15 minutes. Data lives in the browser's
  `localStorage` (key `galil-taskana-v1`) and nothing leaves the browser.
- **Microsoft 365** (Entra client ID filled in): "Sign in with Microsoft" and
  "Sign in with your email" both go through **Microsoft Entra ID** (MSAL, bundled in
  `js/vendor/`); the password is typed on Microsoft's page, the company MFA policy
  applies, and only `@galiltc.co.il` accounts (and, if set, the GALIL tenant) are
  accepted. The data lives as **files in a OneDrive folder** instead of a database:

  ```
  <Taskana folder on OneDrive>/
    taskana-data.json            the shared data everyone reads and writes
    attachments/<id>-<name>      files attached to tasks (up to 50 MB each)
    backups/taskana-<date>.json  a copy of the data, once a day
  ```

  Every save uploads `taskana-data.json` with its eTag; if someone saved in
  between, their version is downloaded and merged record by record (field by
  field when both changed the same record) before saving again. Other people's
  changes appear within 30 seconds, or at once when the tab is focused. A copy is
  cached in the browser so Taskana opens instantly and keeps working offline;
  pending changes upload when the connection returns.

**Accounts and permissions.** The team in `js/seed.js` (`TEAM`) is the real GALIL
roster with company emails, managers and roles: Tamir Nisman, Inon Kanner and
Danny Gelman are Admins, the client managers are Managers, writers are Members.
Anyone else with a `@galiltc.co.il` account who signs in is added as **Pending
activation**; an Admin lets them in from **People** and picks a role. The roles:
Admin (everything), Manager (clients, projects, any task), Member (tasks),
**External** (outsourced finance, HR or contractors: only the tasks they're
assigned, reported or mentioned in; no Clients, People or Insights), Viewer (read
and comment). People also carry *Employment* (Employee / Outsourced) and *Reports
to*. Admins can add an outsourced person ahead of time with their company email;
their first Microsoft sign-in then goes straight in with that role. External is
enforced by the app; anyone who can open the OneDrive folder itself can read the
raw data file, so share the folder only with GALIL accounts.

**Demo data.** **⇅ Data → Demo data** (Admins) fills Taskana with made-up clients,
projects and tasks — random each time — assigned to the real team, removes them
again (demo records are flagged, real work is left alone), or resets everything.
The first person to open an empty OneDrive folder chooses between the team only,
the team plus demo tasks, or a backup file, and becomes its first Admin.

### Taskana → Microsoft 365 setup

1. **Register the app** in the Microsoft Entra admin center → App registrations →
   New registration: name *Taskana*, *Accounts in this organizational directory
   only*, redirect URI platform **Single-page application** with Taskana's address,
   e.g. `https://<user>.github.io/<repo>/taskana/index.html` (the sign-in screen's
   *Microsoft 365 connection…* dialog shows the exact value). Under API
   permissions add Microsoft Graph delegated **User.Read** and
   **Files.ReadWrite.All** (grant admin consent so people aren't asked one by one).
2. **Make the folder**: create a `Taskana` folder in OneDrive (or a SharePoint
   document library), share it with *People in GALIL* with **edit** rights, and
   copy the link. (Or leave the link empty, sign in, and use **⇅ Data → Share
   folder and copy link**, which shares the `Taskana` folder in your own OneDrive.)
3. **Fill in `site/taskana/config.js`**: `entra.clientId`, `entra.tenantId` and
   `onedrive.folderLink`, then push to `main`. To try settings out first in one
   browser, use *Microsoft 365 connection…* on the sign-in screen.
4. Open Taskana, sign in, and choose how to start.

Microsoft sign-in needs Taskana served over https (GitHub Pages is fine), not
opened as a file.

```
site/taskana/
  index.html        Page shell: loads the CSS and scripts below, in order.
  css/taskana.css   All styles (light/dark tokens, RTL-safe layout).
  fonts/            Noto Sans, Noto Sans Hebrew, Noto Sans Mono (OFL), bundled.
  js/i18n.js        tr() and date formatting; English is the key.
  js/he.js          Hebrew strings.
  config.js         Deployment settings: Entra app registration, OneDrive folder.
  js/vendor/        MSAL (Microsoft Authentication Library for JS, MIT).
  js/core.js        Data model, local storage, permissions, history,
                    notifications, mentions, WorkDesk import.
  js/seed.js        The GALIL team and the random demo-data generator.
  js/storage.js     OneDrive files through Microsoft Graph: load, save with
                    eTags, three-way merge, polling, attachments, backups.
  js/auth.js        Sign-in (Entra ID / email / demo), pending activation,
                    the Microsoft 365 connection dialog.
  js/ui.js          DOM helper, icons, routing, shell, filters, dialogs,
                    pointer drag-and-drop.
  js/pages.js       Overview, Inbox, My work, Board, All tasks, Clients,
                    Projects, People, saved views.
  js/insights.js    Insights metrics and charts.
  js/task.js        Task detail: fields, checklist, sub-tasks, links,
                    attachments, comments and questions, history.
  js/forms.js       Forms, confirmations and the Data window.
  js/app.js         Start-up and keyboard shortcuts.
tests/taskana/      Playwright browser tests (npm test), run in CI by
                    .github/workflows/taskana-tests.yml.
```

- **Clients → Projects → Tasks.** Projects have a short key (`RSOM`); tasks get
  keys like `RSOM-12`. Moving a task or renaming a project key keeps the old
  keys working.
- **Tasks:** assignee (anyone), doc-oriented type, priority, start and due
  dates (with a Fri–Sat warning), estimate, deliverable, labels, checklist,
  **sub-tasks**, **links** (blocks / is blocked by / relates to), **attachments**
  (links, or files up to 1 MB) and **repeating** tasks (weekly, every 2 weeks,
  monthly: closing one schedules the next).
- **Workflow:** Backlog → To Do → Writing → Peer Review → SME Review → Done on a
  **Board** (drag with mouse or touch, a Move menu on every card, or Alt+←/→),
  a sortable **All tasks** list with **bulk actions**, **My work** and an
  **Overview**.
- **Comments and questions** with `@mentions` stored by person id; an
  **Inbox** collects mentions, assignments, replies and answered questions.
  Every change is kept in the task's **History**.
- **Saved views** of board or list filters, private or shared.
- **Insights:** closed vs previous period, closing rate, completion, on-time
  delivery, cycle time and lead time (from recorded start and finish), tasks
  assigned per person (from assignment history), overdue share, question
  answer rate; weekly or monthly opened-vs-closed (weeks start on Sunday), work
  by stage, per-person table, project completion, closed work by type.
- **Roles:** Admin (everything), Manager (clients, projects, any task), Member
  (tasks), External (outsourced staff: their own tasks only), Viewer (read and
  comment).
- **English / Hebrew** with a right-to-left layout, light/dark theme, phone
  layout, keyboard access and screen-reader labels.
- **⇅ Data:** JSON backup, validated restore with undo, CSV export (safe to
  open in Excel), import of people/clients/projects from WorkDesk, fill / remove
  / reset demo data, OneDrive folder and sync status (or the storage meter in the
  standalone demo).

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

### What's new in V7.2

- **Management sub-tabs reordered**: People · Teams · Clients · Projects ·
  Work Orders · Budgets · Assignments & Allowances · Expense Types ·
  Verification Queue (Pending Activation last).
- **Teams redesigned as cards** with a required name, description and
  department (built-in technical-writing departments or a typed one) and
  optional colour, short code, contact, location and main clients.
- **Available people** panel: anyone without a team and/or direct manager can
  be placed in a team, whose lead becomes their manager.
- **Team loans and transfers**: ask another team's lead, the person's manager
  or the CEO for a person — temporarily, for a client's project or task
  between two dates (the approved loan creates a date-limited assignment and
  task membership), or permanently. Both are decided in Approvals.
- **Handbook chapter 2, "How WorkDesk fits together"**: the records, how they
  relate (diagram), work orders, tasks vs. assignments, and exactly how hours
  are deducted from budgets and allowances.

### Since V7.2

- Duplicate a time entry to the previous or next day or week, a custom number
  of days back or forward (optionally onto every working day in between), or
  a specific date — on desktop (⧉ menu) and phone (⧉ Duplicate…).

### What's new in V7.1

- A third hour type, **Blue · Management**, for Team Leads, Project Managers,
  Operations Managers and the CEO — time spent managing a client's projects
  and tasks. Blue works just like Yellow: attributed to a client/project and
  drawn from the personal allowance and the project or work-order budget.
- Duplicate a time entry to the next day or the next week, and click a work
  order code anywhere in a table to copy it to the clipboard.
- Expense evidence attachments can be replaced or removed in place.
- A light/dark theme switch, applied across the app, the Handbook and the
  GALIL website — each remembers the choice per device.
- A dedicated phone build below 820px width, built around a running timer,
  with its own Time / Plan / Tasks / Expenses / More navigation.

### Teams

**Management → Teams** (to the right of People) lets Team Leads, Project
Managers, Operations Managers and the CEO create and customise teams (shown as
cards), place available people in them, set each member's direct manager —
normally themselves — and request people from other teams as a temporary loan
or a permanent transfer (stored in `db.teamRequests`, decided in Approvals).
Leads manage only the teams they lead; Operations and the CEO manage every
team. The direct manager receives the person's sick and vacation requests.
Governed by the `manageTeams` capability; see `TeamsPanel`, `TeamEditor`,
`TeamRequestModal` and `applyTeamRequest` in `site/app/index.html`.

### Sick and vacation requests

Sick and Vacation are entered in the Time Log (desktop form or phone sheet)
with a **From** and **To** date; every working day (Sun–Thu) in the range
becomes one day entry. Unless the person recording it is the **CEO**, the
whole range is sent as a single **Leave request** to the employee's direct
manager (falling back to the usual approval chain), and the days stay
Pending — out of every total — until the manager approves or declines them
together. Sick requests can carry a **sick-leave confirmation** (PDF or image,
up to 2 MB) that the approver opens from the request card. See `commitLeave`
in `site/app/index.html`.

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

## The Employee Knowledge Base (`site/kb/`)

An internal knowledge base for GALIL employees: **Onboarding** (welcome,
first-week checklist, accounts and systems), **Company rules** (code of
conduct, working hours and time reporting, leave, expenses, information
security, client confidentiality) and **Training & how-to's** (VPN setup,
MFA, signing in to WorkDesk, logging time, planning the week, expenses,
tasks, phishing). Static HTML with no build step, searchable, light/dark
theme, phone-friendly. Articles live in the `ARTICLES` array in
`site/kb/index.html` — add or edit an entry there to change the content.

**Opening it:** the book button in the WorkDesk top bar (desktop) or
**More → 📖 Knowledge Base** (phone) opens it in a new tab.

**Who can see it:** every role except **External Contractor** and
**Viewer** — the `knowledgeBase` capability in the app's permission matrix
(`PERM` in `site/app/index.html`, also listed under ⚙ → Roles & permissions).
The button is hidden for EXT and VIEW, and the Knowledge Base page itself
reads the WorkDesk session from the browser and shows a "No access" screen
for those roles, or a "Sign in to WorkDesk first" screen when nobody is
signed in. Like the rest of the standalone build this is a client-side
check; it should move behind the same server-side auth as the app when
Microsoft Entra ID sign-in lands (see **Roadmap**).

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` builds `site-mui` and
publishes it to GitHub Pages on every push to `main`, with `site/app/` and
`site/handbook/` and `site/kb/` carried over unchanged into the same deploy. One manual,
one-time step is required before it will run successfully: in the repo's
**Settings → Pages**, set **Source** to **GitHub Actions**. After that, every
push to `main` that touches `site-mui/` or `site/` redeploys automatically,
and the workflow can also be run by hand from the **Actions** tab. Once
deployed, the website is at the Pages root, the app is at `/app/`, and the
handbook is at `/handbook/`, and the Knowledge Base is at `/kb/`.

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
