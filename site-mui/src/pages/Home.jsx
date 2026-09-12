import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CheckIcon from '@mui/icons-material/Check';
import { useLanguage } from '../lib/LanguageContext';
import { brand } from '../theme';
import AssemblyDiagram from '../components/AssemblyDiagram';

const SERVICES = [
  {
    ref: 'TW / 01',
    title: ['Technical writing', 'כתיבה טכנית'],
    body: [
      'Operator and maintenance manuals, installation guides, software help and SOPs — written from the hardware, not from marketing copy.',
      'מדריכי הפעלה ותחזוקה, מדריכי התקנה, עזרה למשתמש ונהלי עבודה — נכתב מול החומרה, לא מתוך חומר שיווקי.',
    ],
    anchor: '/services#tw',
  },
  {
    ref: 'TR / 02',
    title: ['Training', 'הדרכה'],
    body: [
      'Courseware, instructor guides, e-learning and on-site delivery, built from the documentation we already wrote.',
      'חומרי לימוד, מדריכים למנחה, לומדות והעברת הדרכות באתר הלקוח, בנויים מתוך התיעוד שכתבנו.',
    ],
    anchor: '/services#tr',
  },
  {
    ref: 'IM / 03',
    title: ['Implementation', 'הטמעה'],
    body: [
      'Standing up the documentation practice itself: templates, terminology, style rules, tooling and review workflow.',
      'הקמת מערך התיעוד עצמו: תבניות, מונחון, כללי סגנון, כלים ותהליך אישור.',
    ],
    anchor: '/services#im',
  },
];

const STATS = [
  { v: '15', l: ['Years documenting Israeli industry', 'שנות תיעוד בתעשייה הישראלית'] },
  { v: '20+', l: ['Writers, trainers and editors on staff', 'כתבים, מדריכים ועורכים בצוות'] },
  { v: '900+', l: ['Manuals and courses delivered', 'מדריכים וקורסים שנמסרו'] },
  { v: '2', l: ['Working languages, natively', 'שפות עבודה, ברמת שפת אם'] },
];

const INDUSTRIES = [
  ['Defence systems', 'מערכות ביטחוניות'],
  ['Aerospace', 'תעופה וחלל'],
  ['Medical devices', 'מכשור רפואי'],
  ['Industrial automation', 'אוטומציה תעשייתית'],
  ['Enterprise software', 'תוכנה ארגונית'],
];

export default function Home() {
  const { t } = useLanguage();

  return (
    <>
      {/* ===================== HERO ===================== */}
      <Box sx={{ py: { xs: '40px', md: '74px' } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                sx={{ fontFamily: 'Noto Sans Mono, monospace', fontSize: 12.5, color: brand.annot, letterSpacing: '.04em', mb: '22px' }}
              >
                {t('Rishon LeTsiyyon · established 2009 · EN / עברית', 'ראשון לציון · משנת 2009 · עברית / EN')}
              </Typography>

              <Typography variant="h1" sx={{ fontSize: 'clamp(38px,5.6vw,68px)', mb: '22px' }}>
                {t('Someone has to explain the machine.', 'מישהו צריך להסביר את המכונה.')}
              </Typography>

              <Typography sx={{ fontSize: 'clamp(18px,1.6vw,21px)', color: brand.steel, maxWidth: '44ch' }}>
                {t(
                  "GALIL writes the manuals, procedures and training that let your customers, technicians and new engineers use what you built — correctly, on the first attempt, in Hebrew and in English.",
                  'גליל כותבת את המדריכים, הנהלים וההדרכות שמאפשרים ללקוחות, לטכנאים ולמהנדסים החדשים שלכם להפעיל את מה שבניתם — נכון, כבר בפעם הראשונה, בעברית ובאנגלית.'
                )}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px', mt: '30px' }}>
                <Button component={RouterLink} to="/contact" variant="contained" disableElevation>
                  {t("Tell us what you're building", 'ספרו לנו מה אתם בונים')}
                </Button>
                <Button
                  component={RouterLink}
                  to="/services"
                  variant="outlined"
                  sx={{ borderColor: brand.rule, color: brand.forest, '&:hover': { borderColor: brand.forest, bgcolor: '#fff' } }}
                >
                  {t('See what we produce', 'מה אנחנו מפיקים')}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: '9px', alignItems: 'flex-start', mt: '26px', maxWidth: '40ch' }}>
                <CheckIcon sx={{ fontSize: 17, color: brand.green, mt: '2px' }} />
                <Typography sx={{ fontSize: 14.5, color: brand.steel }}>
                  {t(
                    'Working under NDA with defence, aerospace and industrial manufacturers since 2009.',
                    'עובדים תחת הסכמי סודיות עם יצרנים בתחומי הביטחון, התעופה והתעשייה משנת 2009.'
                  )}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <AssemblyDiagram />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ===================== WHAT WE DO (teaser) ===================== */}
      <Box sx={{ py: { xs: '56px', md: '104px' } }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: '56ch', mb: { xs: '34px', md: '52px' } }}>
            <Typography variant="h2" sx={{ fontSize: 'clamp(28px,3.4vw,44px)' }}>
              {t('What we do', 'מה אנחנו עושים')}
            </Typography>
            <Typography sx={{ color: brand.steel, mt: '14px', fontSize: 17.5 }}>
              {t(
                'Three practices, usually bought together. Most engagements start with documentation and grow into training once the material exists.',
                'שלושה תחומי פעילות, שנרכשים בדרך כלל יחד. רוב הפרויקטים מתחילים בתיעוד ומתרחבים להדרכה ברגע שהחומר קיים.'
              )}
            </Typography>
          </Box>

          <Grid container spacing="20px">
            {SERVICES.map((s) => (
              <Grid key={s.ref} size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ borderColor: brand.rule, borderRadius: '12px', height: '100%' }}>
                  <CardContent sx={{ p: '26px' }}>
                    <Typography sx={{ fontFamily: 'Noto Sans Mono, monospace', fontSize: 12.5, color: brand.annot, mb: '10px' }}>
                      {s.ref}
                    </Typography>
                    <Typography variant="h3" sx={{ mb: '9px' }}>
                      {t(s.title[0], s.title[1])}
                    </Typography>
                    <Typography sx={{ color: brand.steel, fontSize: 15.5, mb: 0 }}>{t(s.body[0], s.body[1])}</Typography>
                    <Box
                      component={RouterLink}
                      to={s.anchor}
                      sx={{ display: 'inline-block', mt: '14px', fontSize: 14, fontWeight: 600, color: brand.greenDeep, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {t('Read more →', 'עוד ←')}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===================== PROOF ===================== */}
      <Box sx={{ bgcolor: brand.forestDeep, color: '#EAF2E4', py: { xs: '56px', md: '104px' } }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: '56ch', mb: { xs: '34px', md: '52px' } }}>
            <Typography variant="h2" sx={{ fontSize: 'clamp(28px,3.4vw,44px)', color: '#fff' }}>
              {t('Fifteen years of other people’s machines', 'חמש־עשרה שנה של מכונות של אחרים')}
            </Typography>
            <Typography sx={{ color: '#A9BFA2', mt: '14px', fontSize: 17.5 }}>
              {t(
                'Most of our work sits behind an NDA, so here is what we can say.',
                'רוב העבודה שלנו נמצאת תחת הסכמי סודיות, ולכן הנה מה שכן אפשר לומר.'
              )}
            </Typography>
          </Box>

          <Grid container spacing={{ xs: '28px', md: '34px' }} sx={{ mb: { xs: '38px', md: '60px' } }}>
            {STATS.map((s) => (
              <Grid key={s.v} size={{ xs: 6, md: 3 }}>
                <Typography sx={{ fontSize: 'clamp(40px,5vw,62px)', fontWeight: 700, letterSpacing: '-.04em', color: brand.green, lineHeight: 1 }}>
                  {s.v}
                </Typography>
                <Typography sx={{ mt: '10px', fontSize: 15, color: '#A9BFA2', maxWidth: '22ch' }}>{t(s.l[0], s.l[1])}</Typography>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ borderTop: '1px solid #2C4A32', pt: '26px' }}>
            <Grid container spacing="14px">
              {INDUSTRIES.map((ind) => (
                <Grid key={ind[0]} size={{ xs: 6, sm: 4, md: 'auto' }} sx={{ minWidth: 140, flexGrow: 1 }}>
                  <Box
                    sx={{
                      border: '1px solid #2C4A32',
                      borderRadius: '9px',
                      p: '17px 14px',
                      textAlign: 'center',
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: '#C6DABE',
                      bgcolor: '#1A3822',
                    }}
                  >
                    {t(ind[0], ind[1])}
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Typography sx={{ mt: '20px', fontSize: 13.5, color: '#84A07C' }}>
              {t('Client names available under NDA on request.', 'שמות לקוחות יימסרו בכפוף להסכם סודיות.')}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ===================== HIRING BANNER ===================== */}
      <Box sx={{ py: { xs: '56px', md: '104px' } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: `1px solid ${brand.rule}`,
              borderRadius: '16px',
              p: { xs: '26px', md: '40px' },
            }}
          >
            <Box>
              <Typography variant="h2" sx={{ fontSize: 'clamp(24px,2.6vw,32px)' }}>
                {t("We're hiring writers, instructors and more.", 'אנחנו מגייסים כותבים, מדריכים ועוד.')}
              </Typography>
              <Typography sx={{ mt: '10px', color: brand.steel }}>
                {t('See open roles, or send us a CV even if nothing fits today.', 'ראו משרות פתוחות, או שלחו לנו קורות חיים גם אם דבר לא מתאים כרגע.')}
              </Typography>
            </Box>
            <Button component={RouterLink} to="/careers" variant="contained" disableElevation>
              {t('View careers', 'למשרות')}
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}
