# Solar Heatmap Data

Solar's share of total electricity generation across Australia's National Electricity Market (NEM), computed from 5-minute power data in 30-minute blocks.

## Data source

- **API**: [OpenElectricity API](https://api.openelectricity.org.au/v4) (`getNetworkData`)
- **Network**: NEM (National Electricity Market)
- **Metric**: Power (MW), 5-minute intervals
- **Grouping**: `secondaryGrouping: ['fueltech']`
- **Date range**: 1 January 2010 to present

## Processing

Built with `scripts/build-solar-heatmap.js`:

1. Fetches NEM 5-minute power data from the API in 30-day batches (~197 requests)
2. For each 5-minute interval, computes:
   - **Solar generation** = `solar_utility` + `solar_rooftop` (clamped to >= 0)
   - **Total generation** = sum of all fuel techs except loads (`pumps`, `battery_charging`, `battery`), each clamped to >= 0
   - **Solar share** = solar / total * 100
3. Aggregates 5-minute intervals into 30-minute blocks (6 intervals averaged by summing solar and total separately, then dividing)
4. Outputs one JSON file per year

## File format

Each `{year}.json` contains:

```json
{
  "year": 2025,
  "max": 100,
  "days": ["2025-01-01", "2025-01-02", ...],
  "data": [
    [0, 0, 0, ..., 64.1, 65.2, ..., 0, 0],
    ...
  ]
}
```

| Field | Description |
|-------|-------------|
| `year` | Calendar year |
| `max` | Maximum solar share (%) observed in any 30-minute slot that year |
| `days` | Array of date strings (`YYYY-MM-DD`) in chronological order |
| `data` | Array of arrays; one per day, each containing 48 values (30-min slots) |

Each inner array has 48 elements representing 30-minute blocks of the day:
- Index 0 = 00:00-00:30 AEST
- Index 1 = 00:30-01:00 AEST
- ...
- Index 24 = 12:00-12:30 AEST
- ...
- Index 47 = 23:30-00:00 AEST

Values are solar share as a percentage (0-100), rounded to 1 decimal place.

## File sizes

| File | Size | Days | Max solar % |
|------|------|------|-------------|
| 2010.json | 40 KB | 365 | 0.0% |
| 2011.json | 40 KB | 365 | 0.0% |
| 2012.json | 40 KB | 366 | 0.0% |
| 2013.json | 40 KB | 365 | 0.0% |
| 2014.json | 40 KB | 365 | 0.0% |
| 2015.json | 40 KB | 365 | 0.0% |
| 2016.json | 48 KB | 366 | 16.0% |
| 2017.json | 58 KB | 365 | 18.0% |
| 2018.json | 60 KB | 365 | 26.6% |
| 2019.json | 62 KB | 365 | 33.2% |
| 2020.json | 63 KB | 366 | 43.8% |
| 2021.json | 63 KB | 365 | 52.5% |
| 2022.json | 63 KB | 365 | 58.2% |
| 2023.json | 64 KB | 365 | 64.3% |
| 2024.json | 65 KB | 366 | 69.6% |
| 2025.json | 64 KB | 365 | 100.0% |
| 2026.json | 8 KB | 43 | 69.3% |
| **Total** | **876 KB** | | |

## Key findings

### Solar emerged around 2016

The API returns no solar generation data (`solar_utility`, `solar_rooftop`) for 2010-2015. Solar first appears in 2016 with a peak share of 16%. This aligns with the early rollout of rooftop solar and the first utility-scale solar farms in Australia.

### Rapid growth from 2016 to 2025

Peak solar share roughly doubled every 2-3 years:
- **2016**: 16% (solar emerges)
- **2018**: 27% (rooftop solar boom)
- **2020**: 44% (utility-scale expansion)
- **2022**: 58% (solar dominates midday)
- **2024**: 70% (approaching grid saturation)

### Seasonal pattern

Solar share is highest in summer (Dec-Feb) and lowest in winter (Jun-Aug), driven by longer daylight hours and higher solar irradiance. The heatmap shows a characteristic "bulge" shape - wider in summer, narrower in winter - similar to the BBC's UK solar visualization but more pronounced due to Australia's higher solar resource.

### Midday dominance

By 2024-2025, solar routinely provides 60-70% of total NEM generation during midday hours (10:00-14:00 AEST) in summer. Even in winter, midday solar share reaches 30-36%.

### Dawn/dusk edge cases

The 2025 maximum of 100% occurs at dawn (5:30 AM on 26 Oct 2025) when total generation is very small and solar is briefly the only source. For visualisation, a colour scale capped at 50-60% (like the BBC reference) works well.

## Regenerating

```bash
bun scripts/build-solar-heatmap.js
```

Takes ~10 minutes (197 API requests with 500ms delay between each). Overwrites existing JSON files.
