# /tracker/map — map-first grid tracker

A fullscreen MapLibre shell (reusing the `/facilities` fullscreen system) with a
panel that carries explore-style generation charts, a metrics grid and live
interconnector flows. Reached via the `tracker_nav` feature flag (logo-dropdown
nav item only) while in alpha; the route itself is not gated and is excluded
from the sitemap.

## View model

Two display modes, toggled by the filter bar's Panel|Map switcher
(`?view=panel`; map is the omitted default):

- **Map view** — on-anchor mini charts plus the docked All-Australia card
  replace the panel (see "Map charts view"); the panel only appears while a
  corridor is open.
- **Panel view** — the side panel (desktop `ResizablePanel` / mobile
  `BottomSheet`) carrying the charts below.

Below the tablet breakpoint an unqualified URL falls back to the panel view —
the map view has no sheet and the marker cards overwhelm a phone frame. An
explicit `?view=` always wins; since map is the omitted default, a mobile
user's explicit Map pick doesn't survive a reload (the safe view wins on an
ambiguous phone URL).

Within the panel, the content is selection-driven from existing URL state:

| URL state                | Panel view                                                 |
| ------------------------ | ---------------------------------------------------------- |
| `?ic=nsw1-qld1`          | Interconnector view (`InterconnectorDetail`)               |
| `?region` omitted / `au` | Grid generation — All Regions, NEM+WEM (`GenerationPanel`) |
| `?region=_all`           | Grid generation — whole NEM (`GenerationPanel`)            |
| `?region=wem`            | Grid generation — WEM (no corridors)                       |
| `?region=sa1` (etc.)     | Region generation (`GenerationPanel`)                      |

The region dropdown uses a tracker-local option list (`tracker-regions.js`) —
the shared `$lib/regions.js` list plus the "All Regions" (`au`) entry, which is
deliberately not added to the shared list (scenarios and the studio explorer
can't handle a two-network scope). The `au` panel data comes from
`/api/network/data?region=au`, which merges one NEM and one WEM upstream call
server-side (`$lib/server/network-data-au.js`): sub-daily WEM rows are
relabelled +2h onto the AEST clock (absolute-time join — the OE API's own AU
network joins on wall-clock strings and displaces WEM by 2 real hours) and the
merged series trim to the two networks' common live edge; daily+ rows join on
their local calendar-day labels. Having no national spot price, the `au` scope
drops the price chart and the avgPrice metric cell (the NEM chips stay — each
is labelled with its own region).

Transitions:

- The **region dropdown** switches grid⇄region. It clears any open corridor (a
  region pick is an explicit view switch) and fits the map to the region's
  bounds (`REGION_BOUNDS` in `Map.svelte` — hand-tuned per region, including a
  WEM box over the SWIS). Region/corridor focus must use `fitBounds`, never
  `flyTo` with camera `padding`: the svelte-maplibre-gl wrapper resets any
  transform padding via `jumpTo`, which kills the in-flight animation (see the
  comment on `REGION_BOUNDS`).
- Clicking a **corridor** (map arc, or a corridor card header in the panel)
  opens the interconnector view and `fitBounds` the corridor. **Back/Esc**
  return to the scope's generation view and the previous framing.
- `GenerationPanel` survives grid⇄region switches — `NetworkChart` swaps its
  warm-stashed data manager per region while the viewport carries over, so the
  charts morph instead of remounting.

## GenerationPanel

A grey canvas of white `sectionCardClass` cards, styled to match
`/facility/[code]`:

1. **Metrics card** — `toolbarTrayClass` tray (date-range label +
   `ChartRangeBar`, 7D/30m default to match explore.openelectricity.org.au),
   the `NetworkMetrics` grid, and a live strip (regional spot-price chips from
   the grid-live poll + dispatch "as at"; NEM scopes only).
2. **Generation chart** — `NetworkChart`, stacked by fuel tech (Detailed
   group). Matches the homepage 7-day tracker visual: the default cumulative
   stack (loads order first and pull the whole area below zero — **not** a
   diverging stack) plus nighttime shading (`nightShading` prop, sub-daily
   grains only).
3. **Price chart** — `NetworkChart` line.
4. **Emissions card** — Volume ⇄ Intensity `SwitchTabs` per the facility
   design. Volume is a fueltech-stacked `NetworkChart`
   (`metric="emissions"`, tonnes per bucket, never inverted); Intensity is a
   derived line (`metric="emissions_intensity"` — the route fetches
   emissions + a power/energy basis in one request, the processor emits
   component series, and the chart derives kgCO₂e/MWh per display bucket as
   a ratio of sums, matching the facility's `deriveIntensityRows`).
5. **Corridor flow cards** — one per corridor in scope
   (`interconnectorsForRegion`), each with a clickable header
   (label + `CorridorMetrics`) and an inline `InterconnectorChart` flow chart,
   so a region pick surfaces its flows immediately with no click-through.
   Every `InterconnectorChart` shares one corridor-agnostic fetch
   (`region=_all&primary_grouping=network_region`), so N corridors cost one
   request.

One `createChartRangeControl` drives everything — both `NetworkChart`s, every
corridor flow chart and the headless market-pair provider are listed in its
`charts()`, so range presets, calendar picks, pan/zoom mirroring, the
power↔energy hysteresis ladder and gesture-settle fetch reconciliation stay in
lockstep. Shared `hoverTime` syncs tooltips across all charts and the metrics
grid's peak cell; shared tap-to-engage `panZoomEngaged` keeps chart gestures
from hijacking panel scroll (one clickoutside zone spans all chart cards).
Every chart shows its own StratumChart header (title + ✥ engage toggle + ±
zoom buttons) and the `strip` tooltip above the chart — the same chrome on
generation, price and every flow chart.

## Map charts view (`?view=map`)

Each region's chart renders on the map itself, directly above its price chip:
one DOM `Marker` card per NEM region at its `REGION_ANCHORS` point plus one at
the WEM anchor (the WEM card doubles as the WEM network chart — WEM has no
sub-regions, and no live price chip since `/api/prices` is NEM-only).

- **Metric switcher** — Generation | Price | Emissions (`?chart=`, generation
  omitted default), shown in the filter bar while the map view is active.
- **Fixed window** — the last 24 hours, fetched at native 5m and
  display-aggregated to 30m (`map-minis.js`), refreshed on every grid-live
  dispatch tick. Two requests cover all seven charts: one region-grouped NEM
  fetch (`primary_grouping=network_region`) + one WEM fetch
  (`map-charts.svelte.js`).
- **All-Australia card** — docked bottom-centre (not a map marker), a wider
  mini chart of the national NEM+WEM sum with the minis' shared 24h window as
  its footer and the newest bucket's source total in its header. Built
  client-side (`miniSeriesForAu`) from the same two responses: the API's `AU`
  network joins the grids on naive wall-clock strings (WEM displaced 2 real
  hours, newest ~2h NEM-only), so each response is collected with its own
  offset and summed on absolute time instead, trimmed to the two networks'
  overlap so the live edge can't cliff. No national price exists — the price
  metric shows the plain range chip instead.
- **Simplified fuel-tech grouping** for generation/emissions minis (Detailed
  is unreadable at mini size); generation keeps the homepage stack visual
  (loads pull the area below zero); price is a line.
- The cards are non-interactive (`pointer-events-none`, like the price chips)
  so map gestures pass straight through; flow arcs stay live beneath them.
- Corridor clicks still open the interconnector panel over the map view;
  Back/Esc returns to the on-map charts.

## Metrics — homepage renewables methodology

`NetworkMetrics` renders the `NETWORK_METRICS` registry
(`$lib/components/charts/network/network-metric-definitions.js`), computed over
the charts' **visible range** so the numbers track pan/zoom (snapshot taken on
the debounced visible-data cadence, not per pan frame).

- **Renewables %** = `generation_renewable ÷ demand_gross` — the homepage
  methodology (`buildOeHomepageStats`), fetched as a headless pair by
  `createNetworkMarketData` (`network-market-data.svelte.js`) through
  `/api/network/data?metric=renewables|renewables_energy`. Paired summation:
  numerator rows only count where gross demand exists (demand data starts May
  2006).
- **Fossil %** = Σ `FOSSIL_FUEL_TECHS` (a real fueltech sum from the generation
  chart's already-loaded rows — zero extra fetch) ÷ gross demand. Measured
  independently of the renewables share, so the pair needn't sum to 100%.
  Requires the Detailed grouping (its series ids are raw fueltech codes).
- Average/peak gross demand, time-weighted average price, total source
  generation (imports and loads excluded). Pure maths lives in
  `network-metrics-calc.js` with unit tests — mixed-grain row sets are
  normalised to energy before any cross-set ratio.

Known v1 limitation: chart legend toggles don't affect the metrics (the
visible-data callback emits the full series set).

## Data flow

- **No server load** — `+page.js` only validates URL state and flags
  `fullscreen: true` for the root layout.
- **Live snapshot** — `createGridLive()` polls `/api/flows` + `/api/prices`
  every 5 min → map arcs, price chips/markers, corridor metrics, live-edge
  chart advance.
- **Chart series** — self-fetched via `ChartDataManager` through
  `/api/network/data` (generation/price/market pair, per scope) with shared
  request dedupe and a completed-response LRU.

## URL params

All shallow `replaceState`, built from `window.location.href` (never
`page.url`, which goes stale after shallow updates); defaults are omitted so
the canonical URL stays clean.

- `region`, `ic` — the view state (above). `au` (All Regions) is the omitted
  region default; every other scope — including NEM-wide `_all` — serialises
  explicitly. `?region=wem` forces `ic` null in the load (corridors are
  NEM-only).
- `view` — `panel` for the panel view (map default omitted);
  `chart` — the map charts' metric (`price` | `emissions`; generation omitted).
- `theme`, `transmission`, `flows`, `legend`, `fullscreen` — map/chrome state.
- `range`, `start`, `end`, `interval` — the generation view's chart range
  (facility `range-params.js` schema), written only by `GenerationPanel`;
  shared links reproduce the view.

## Mobile

Below the tablet breakpoint (768px) the panel becomes a persistent
`BottomSheet` (peek 0.45): the sheet header + metrics show at peek, charts and
corridor cards on expand/scroll. Tap-to-engage pan/zoom keeps chart gestures
from fighting sheet scroll.
