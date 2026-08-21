# Tracker Explore

`/tracker/explore` is a locally savable canvas backed by curated OpenElectricity API queries. Its
progressive builder has **Cards**, **Layout** and **View** sections. Adding a card uses a focused
**Data → Options** flow with **Add** as the footer action; editing opens directly on Options and does
not fetch until the user selects **Apply**. Unsupported presentations are omitted.

The chart-first canvas opens on **Overview**: a protected single-column 7-day, 30-minute market view
containing Generation mix, emissions volume, emissions intensity and spot price charts. The canvas
itself contains only charts; view switching and creation live in the shared Explore bar. Overview
cannot be reconfigured, overwritten or deleted. Duplicating it creates and opens an editable
browser-local copy. Starting blank creates an empty one-column canvas. Views support up to 12 items
and require an explicit Save. A versioned portable JSON snapshot can be copied and pasted to create a
new unsaved view. Sanity persistence and durable share links remain deferred.

On desktop, Cards, Layout and View controls slide over the left of the canvas in a non-modal drawer.
Tablet and mobile use the same content in a bottom sheet. Adding or applying a card, saving, cancelling
or pressing Escape closes the panel. JSON transfer is progressively disclosed inside View.

The canvas supports **Shared** and **Per card** controls. Shared mode owns the network region and one
fully synchronised range/interval viewport for every network, facility, chart and metric card. The
sticky sub-header contains those controls; panning or zooming any card updates its peers and the
picker. Per-card mode restores each card's stored region, preset and grouping without rewriting it.
Overview and new views start shared. Earlier snapshots without a `controls` field open in per-card
mode without changing their card queries.

In shared mode, **Technologies** opens a right-hand desktop drawer or mobile bottom sheet containing
the generation breakdown table. Its grouping, toggles and visible-range values are view-level.
Generation, emissions volume and market value charts and metrics follow the toggles, and emissions
intensity is recalculated from the included groups. Price, demand, flows, facilities, curtailment and
the official renewable aggregates remain independent. A visible generation card supplies the table;
when none exists, a provider is mounted only while the drawer needs it. Equivalent card/provider
requests continue to share one network call through `ChartDataManager`.

## Saved view schema

Portable views use `kind: "tracker-view"`, `version: 1` and the evolving JSON Schema at
[`/schemas/tracker-view-v1.schema.json`](/schemas/tracker-view-v1.schema.json). The snapshot contains
view metadata, shared/per-card control state, the configured 1–3-column layout, and ordered cards with
their recipe, presentation, query, column span and pixel height. Card queries keep their own scope,
range and grouping even in shared mode so changing back to per-card controls is lossless. Shared
custom ranges store exact ISO start/end instants. Local IDs and timestamps wrap the snapshot in
browser storage but are deliberately excluded from copied JSON.

The optional `controls` field was added while the contract is still work in progress. Existing v1
JSON without it remains valid and materialises in per-card mode; subsequent copies and saves include
the current control state without introducing another schema version.

Imports are atomic: malformed, unknown-version or structurally invalid snapshots do not alter the
canvas. A saved facility that is no longer in the current catalogue remains as an unavailable card
that can be reconfigured or removed.

The desktop canvas uses the saved maximum column count and supports card drag ordering and bounded
240–720px height resizing. Tablet uses at most two columns. Mobile renders the same order in one
column, ignores spans without deleting them, clamps display height to 480px, and uses accessible move
controls instead of canvas dragging.

Metrics reuse the chart data pipeline but reduce the selected range to one intentional headline:
quantities such as generation, emissions, market value and curtailment are totals; rates such as
demand, spot price and emissions intensity are averages. Renewable share is calculated from paired
range totals (`Σ generation_renewable ÷ Σ demand_gross`), matching the homepage methodology rather
than averaging interval percentages. Facility comparison remains chart-only.

## Recipes

| Recipe              | OE SDK query                                                             | Options                                              |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| Generation mix      | `getNetworkData` (`power` or `energy`)                                   | Region, range, interval, technology grouping         |
| Demand              | `getMarket` (`demand` or `demand_gross`)                                 | Region, operational/gross demand, range, interval    |
| Spot price          | `getMarket` (`price`)                                                    | NEM/WEM region, range, interval                      |
| Emissions           | `getNetworkData` (`emissions`, plus the generation basis for intensity)  | Region, volume/intensity, range, interval, grouping  |
| Market value        | `getNetworkData` (`market_value`)                                        | Region, range, interval, grouping                    |
| Renewables          | `getMarket` (`generation_renewable` or the paired official share inputs) | Region, measure, storage definition, range, interval |
| Curtailment         | `getMarket` (wind and/or solar curtailment)                              | Individual NEM region, source, range, interval       |
| Imports and exports | `getMarket` (`interconnector_*`)                                         | Individual NEM region, range, interval               |
| Facility generation | `getFacilityData`                                                        | Network, one facility, units, range, interval        |
| Facility comparison | `getFacilityData`                                                        | Network, two to six facilities, range, interval      |

The Generation recipe deliberately reproduces the current Tracker generation view: stacked chart,
technology breakdown and series toggles, night shading, and pan/zoom interaction. Shared mode moves
the breakdown and range controls to the view UI; per-card mode retains the embedded breakdown and
builder controls.

Renewable-generation items carry a footer linking to the OpenElectricity methodology guide. The
official aggregate includes rooftop solar; the optional storage definition is stated explicitly.

## Range limits

The range presets only expose compatible display intervals. OpenElectricity API v4.5.11 accepts a
maximum 30-day request at `5m` and a maximum 365-day request at `1h` (verified 21 August 2026).
`ChartDataManager` splits wider visible windows into bounded requests using
`$lib/oe-api/data-limits.js`; the server endpoints also reject direct requests beyond those caps.
Daily and coarser intervals support the longer presets used here.

Facility comparison is capped at six facilities in the product and in the endpoint, below the SDK's
30-facility request limit. Comparisons aggregate units into one line per facility; load units are
shown below zero.

## Implementation map

- `explore-model.js` defines recipes, defaults, normalisation and validation.
- `ExploreBuilder.svelte` is the shared desktop/mobile Data → Options configuration flow.
- `ExploreCardsPanel.svelte`, `ExploreLayoutPanel.svelte` and `ExploreSavePanel.svelte` provide the
  drawer's Cards, Layout and View sections; `ExploreCreatePanel.svelte` handles the two creation
  paths.
- `tracker-view-model.js` owns the versioned portable snapshot contract and responsive layout rules.
- `tracker-view-storage.js` wraps snapshots with local IDs and timestamps for browser persistence.
- `ExploreCanvas.svelte` owns the working draft, dirty state and applied chart instances.
- `ExploreChartCard.svelte` maps a validated recipe to existing chart components.
- `/api/network/data` serves network and market recipes.
- `/api/facilities/compare` validates and serves multi-facility requests.

Possible later additions include Sanity-backed cross-device views and durable links, records,
facility metadata filters, and arbitrary metric composition. These remain outside the curated schema
so that every builder combination maps to a known-valid API call.
