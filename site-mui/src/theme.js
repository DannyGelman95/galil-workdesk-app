import { createTheme } from '@mui/material/styles';

// GALIL brand — Palette A (Continuity) + Noto Sans, per the brand deck.
const brand = {
  paper: '#FBFCF9',
  surface: '#F1F5EC',
  forest: '#1F3D24',
  forestDeep: '#14301C',
  green: '#8CC63E',
  greenDeep: '#4E7A1C',
  steel: '#6B7A6E',
  rule: '#D9E4D0',
  annot: '#17A3B8',
};

export { brand };

export function getTheme(direction) {
  return createTheme({
    direction,
    palette: {
      mode: 'light',
      background: { default: brand.paper, paper: '#FFFFFF' },
      primary: { main: brand.green, dark: brand.greenDeep, contrastText: '#12240F' },
      secondary: { main: brand.annot },
      text: { primary: brand.forest, secondary: brand.steel },
      divider: brand.rule,
      error: { main: '#C0392B' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Noto Sans","Noto Sans Hebrew","Segoe UI",Arial,sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.035em' },
      h2: { fontWeight: 600, letterSpacing: '-0.02em' },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', fontSize: 20 },
      h4: { fontWeight: 700, fontSize: 13.5, textTransform: 'uppercase', letterSpacing: '0.05em' },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '13px 24px', fontSize: 15 },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: brand.paper },
        },
      },
    },
  });
}
