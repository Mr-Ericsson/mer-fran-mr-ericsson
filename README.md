# Mer från utvecklaren (PC-CATALOG-01)

Remote catalog för Mr Ericsson-spel.

- Spec: `C:\dev\ALL GAMES\knowledge\installations\pc-catalog-01-more-from-developer.md`
- UI: [`UI-SPEC.md`](UI-SPEC.md)
- Data: [`games.json`](games.json)
- Ikonprocess: [`scripts/process_icons.py`](scripts/process_icons.py)

## Sidor

| Fil | Innehåll |
|-----|----------|
| `index.html` | Katalog (Play / testning / utveckling) |
| `about.html` | Vem är Mr Ericsson? (tom, fylls senare) |
| `testers.html` | Lista appar testare ska ha installerade |

## Preview

```bash
npx --yes serve -l tcp://0.0.0.0:5173
```

Telefon (samma Wi‑Fi): `http://<pc-ip>:5173/`  
Hide: `?hide=com.mrericsson.numbermerge`

## Data

- `live` — produktion på Play  
- `testing` — under testning  
- `upcoming` — utvecklingsidéer (länk → hemsida)  
- `testers.installNow` — id:n som visas på testarsidan  
- `social.*` / `playDeveloperUrl` — fyll i när URL:er finns  

Hemsida: `https://www.mrericsson.com`
