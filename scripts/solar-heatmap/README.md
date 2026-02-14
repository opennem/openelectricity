# Solar Heatmap Data Pipeline

Three scripts work together to produce the solar heatmap data served at `/studio/solar`.

### 1. `fetch-power.js`

Fetches raw NEM 5-minute power generation data from the OpenElectricity API (2010 to present) and writes per-year CSV files with all fuel tech columns.

```bash
bun run data:fetch-power
```

- Fetches in 30-day batches with a 500ms delay between requests
- Output: `static/data/ignore/<year>.csv`
- Takes several hours to run for the full date range
- Uses the `openelectricity` npm package

### 2. `build.js`

Fetches NEM 5-minute power data from the API and computes solar's share of total generation for each 30-minute block per day. Writes one JSON file per year.

```bash
bun run data:build-solar
```

- Fetches in 30-day batches (same as above) and aggregates into 30-min slots
- Solar columns: `solar_utility`, `solar_rooftop`
- Load columns (excluded from total): `pumps`, `battery_charging`, `battery`
- Output: `static/data/solar-heatmap/<year>.json`
- Each JSON: `{ year, max, days: ["YYYY-MM-DD", ...], data: [[slot0, slot1, ..., slot47], ...] }`
- Values are solar % of total generation (0-100, 1 decimal place)
- Takes several hours for the full date range

### 3. `export-csv.js`

Converts the JSON heatmap files into CSV format for download.

```bash
bun run data:export-solar-csv
```

- Reads all `*.json` files from `static/data/solar-heatmap/`
- Output: `static/data/solar-heatmap/<year>.csv` (alongside the JSON files)
- CSV columns: `date, 00:00, 00:30, 01:00, ..., 23:30`
- Runs in seconds (local file conversion only, no API calls)

### Typical workflow

To regenerate all solar heatmap data from scratch:

```bash
# 1. Build the heatmap JSON files (fetches from API, takes hours)
bun run data:build-solar

# 2. Export to CSV for the download links
bun run data:export-solar-csv
```

### Requirements

- Node.js >= 22.12.0 or Bun
- `openelectricity` package (installed via `bun install`)
- API key is embedded in the scripts
