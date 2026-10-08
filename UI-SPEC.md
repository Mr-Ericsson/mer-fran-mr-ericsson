# Mer från utvecklaren — UI-spec (PC-CATALOG-01)

Mobil-först catalog-yta som ska kännas som en **in-app-skärm**, inte en hemsida.

## Visuell riktning

**Studio ink** — mörk, lugn spelstudio-yta med Mr Ericsson-brand (kod/monitor) som diskret signal. Inte blogg, inte Play Store-klon, inte lila-gradient-AI-look.

## Design tokens

### Färg

| Token | Värde | Användning |
|-------|--------|------------|
| `--bg-0` | `#0A0D12` | Sidbakgrund |
| `--bg-1` | `#121821` | Header / sticky bar |
| `--bg-2` | `#1A2230` | Rad-/listyta (subtil, inte “kort-stack”) |
| `--ink` | `#E8EEF7` | Primär text |
| `--ink-muted` | `#8B97A8` | Sekundär / teaser |
| `--line` | `rgba(232,238,247,0.08)` | Separators |
| `--accent` | `#3DDC97` | CTA / fokus (mint, inte lila) |
| `--accent-ink` | `#04140C` | Text på accent-knapp |
| `--warn` | `#F0B429` | “Kommande”-badge |
| `--danger` | `#FF6B6B` | Felstate (preview) |

Bakgrund: vertikal gradient `--bg-0` → något djupare blåsvart + mycket subtil noise/radial glow bakom header (atmosfär, inte dekor-abstraktion som huvudidé).

### Typografi

| Roll | Font | Storlek / vikt |
|------|------|----------------|
| Brand / header | **Syne** | 22–28 / 700 |
| Section title | **Syne** | 13 / 700, uppercase, letter-spacing 0.08em |
| Speltitel | **Manrope** | 17 / 650 |
| Body / teaser | **Manrope** | 14 / 400 |
| Knapp | **Manrope** | 14 / 700 |

Google Fonts (gratis). Undvik Inter/Roboto/Arial/system.

### Spacing (8pt)

`4 · 8 · 16 · 24 · 32 · 48`  
Sidmarginal: **20**. Radhöjd spelrad: ikon **56** + vertikal padding **12**. Section-gap: **32**.

### Radius & shadow

| Token | Värde |
|-------|--------|
| `--r-sm` | `10px` (ikon, knapp) |
| `--r-md` | `16px` (listyta) |
| `--shadow` | `0 12px 40px rgba(0,0,0,0.35)` — sparsamt, header/footer endast |

### Motion (minst 2–3)

1. **Enter:** listader stagger-fade/slide upp (~40ms offset, 280ms ease-out)
2. **Press:** CTA scale `0.97` + opacity
3. **Header:** subtil fade-in av brandmark vid load

`prefers-reduced-motion: reduce` → ingen stagger, bara opacity.

---

## Layout (en composition)

```
┌──────────────────────────────────┐
│ ←  Mer från…   [Vem är Mr E?]    │  sticky header
├──────────────────────────────────┤
│ PÅ GOOGLE PLAY                   │
│ [ikon][ikon][ikon]               │  3–4 kolumners ikon-grid
│ UNDER TESTNING / UTVECKLING      │
│ footer: hemsida + social + testare│
└──────────────────────────────────┘
```

**Hero-budget:** ingen marketing-hero. Header + grid. Brand i header. About + testers = egna sidor.

---

## Komponenter

| Komponent | Variants / states |
|-----------|-------------------|
| `AppShell` | default |
| `CatalogHeader` | med bakåt-chevron (visuell; system back i appen) |
| `SectionLabel` | Play / Kommande |
| `GameRow` | `live` (CTA Play) · `upcoming` (badge + teaser) |
| `GameIcon` | image · fallback initialer |
| `PlayButton` | default · pressed · focus-visible |
| `WebsiteLink` | text-länk med pil |
| `EmptyHint` | om `?hide=` dolt allt live (osannolikt) |
| `LoadError` | (preview) “Kunde inte ladda” + Försök igen |

**Inga kort** i hero/list — rader med separator. Play-knapp är interaktionsyta (tillåten “button”, inte kort).

---

## Beteende

- `?hide=<packageName>` tar bort matchande live-rad
- Play-länk: `playUrl` eller härledd från `packageName`
- Hemsidelänk: `websiteUrl` från `games.json`
- Ikon: `icons/<id>.png`; saknas → färgad fallback

---

## DoD (UI)

- [x] Tokens dokumenterade
- [x] Sidan följer tokens (implementation)
- [x] Enhetliga rader/knappar/header
- [x] Motion + reduced-motion
- [x] Mobil 360–430px + desktop läsbar
