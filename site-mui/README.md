# GALIL website — Material UI version

A React + [Material UI](https://mui.com/material-ui/getting-started/installation/)
rebuild of the marketing website in `../site/` (Home, What we do, Careers,
Contact). Same content, copy and bilingual English/Hebrew behaviour as the
static version, componentized with MUI and Vite instead of hand-rolled
HTML/CSS/JS.

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
the static site's markup.

This app is not wired into the repo's GitHub Pages deploy workflow — it's a
standalone Vite project you build and host wherever you like (`npm run
build` then serve `dist/`).
