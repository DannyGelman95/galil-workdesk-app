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
