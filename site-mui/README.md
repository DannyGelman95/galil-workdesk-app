# GALIL website

A React + [Material UI](https://mui.com/material-ui/getting-started/installation/)
build of the GALIL marketing website (Home, What we do, Careers, Contact),
bilingual in English/Hebrew with RTL support. This is the current website —
it replaced the original static HTML/CSS/JS version, now kept for reference
at `../archive/galil-website-static-v1/`.

## Stack

- [Vite](https://vite.dev/) + React
- [Material UI](https://mui.com/material-ui/) (`@mui/material`, `@mui/icons-material`)
- [React Router](https://reactrouter.com/) for the four pages
- `stylis-plugin-rtl` + an RTL Emotion cache for the Hebrew layout

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

## Structure

```
src/
  theme.js                 MUI theme — GALIL brand palette, typography.
  lib/
    LanguageContext.jsx     EN/HE state, sets <html lang/dir>, exposes t(en, he).
    rtlCache.js              Emotion caches (LTR / RTL via stylis-plugin-rtl).
    useMailtoForm.js         Shared validate-then-mailto logic for the
                             Contact and Careers/CV forms (no backend yet,
                             same as the static site — see root README).
  components/
    Header.jsx, Footer.jsx, Layout.jsx, PageHead.jsx
    GalilLogo.jsx, AssemblyDiagram.jsx   Hero exploded-assembly diagram.
  pages/
    Home.jsx, Services.jsx, Careers.jsx, Contact.jsx
```

Every string in the UI is passed through `t(english, hebrew)` from
`useLanguage()`, mirroring the `data-en`/`data-he` attribute pairs used in
the archived static site's markup.

Routing uses React Router's `HashRouter` (`/#/services`, `/#/careers`, …) so
the built output is plain static files with no server-side rewrite rules —
it can be dropped into any static host, including GitHub Pages.

## Deployment

`.github/workflows/deploy-pages.yml` builds this app (`npm ci && npm run
build`) and publishes `dist/` at the GitHub Pages root, with `site/app/` and
`site/handbook/` copied in alongside it unchanged. See the root README's
**Deployment** section.
