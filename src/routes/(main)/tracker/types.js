/**
 * Feature-local types for the tracker page. JSDoc-only module — import these
 * via `@typedef {import('./types.js').X} X`.
 */

/**
 * Price card display mode. `market_value` is also the forced mode for the
 * 'au' scope, which has no national spot price.
 * @typedef {'price' | 'market_value'} PriceMode
 */

/**
 * Emissions card display mode.
 * @typedef {'volume' | 'intensity'} EmissionsMode
 */

/**
 * Denominator for the chart and fuel-tech table's contribution percentages.
 * @typedef {'generation' | 'demand'} ContributionMode
 */

/**
 * Optional series drawn over the generation chart and persisted in the URL.
 * The registry (order, labels, colours) lives in `tracker-overlays.js`.
 * @typedef {'demand' | 'renewables' | 'curtailment-solar' | 'curtailment-wind'} TrackerOverlay
 */

/**
 * Selected range: a rolling preset (days, -1 = All) or exact custom bounds.
 * @typedef {{ kind: 'preset', days: number, intervalId: string }
 *         | { kind: 'custom', startMs: number, endMs: number, intervalId: string }} TrackerRange
 */

/** @typedef {'timeline' | 'profile' | 'compare'} TrackerView */

/**
 * Navigation state carried by the URL (plus `nowMs`, added by the page load).
 * @typedef {Object} TrackerUrlState
 * @property {string} region
 * @property {string} group - Fuel-tech grouping value
 * @property {TrackerView} view - Analysis view shown by the nav switcher
 * @property {import('./region-comparison.js').RegionComparisonSelection} regionComparison
 * @property {'lines' | 'bands' | 'radial' | 'ridgeline' | 'heatmap'} profileStyle - Breakdown: multi-line, percentile bands, radial clock, ridgeline or radial heatmap
 * @property {'stacked' | 'breakdown'} profileDisplay - Profile: all-technology stack or per-series cards
 * @property {boolean} profileToday - Breakdown charts add the current, incomplete day
 * @property {'5m' | '30m'} profileInterval - Profile time-of-day slot length
 * @property {7 | 14 | 28} profileDays
 * @property {string} profileEnd - Last complete local day, or empty for relative yesterday
 * @property {import('./comparison.js').Comparison | null} comparison - Exact displayed interval starts, or null when closed
 * @property {string[]} hiddenSeries - Hidden group IDs, validated against the grouping
 * @property {ContributionMode} contributionMode
 * @property {import('$lib/components/charts/v2/ChartOptions.svelte.js').DataTransformType} generationTransform
 * @property {import('$lib/components/charts/v2/ChartOptions.svelte.js').DataTransformType} marketValueTransform
 * @property {TrackerRange} range
 * @property {string | null} bucketFilter - Recurring calendar period (All range only)
 * @property {PriceMode} priceMode
 * @property {EmissionsMode} emissionsMode
 * @property {TrackerOverlay[]} overlays
 * @property {boolean} tablePanelOpen
 * @property {boolean} fullscreen
 */

/**
 * The generation chart's visible-data snapshot (NetworkChart `onvisibledata`).
 * @typedef {Object} GenerationSnapshot
 * @property {string} queryKey - Identity attached by the producing chart
 * @property {Array<Record<string, any>>} data - Chart-ready rows at the display grain
 * @property {Array<Record<string, any>>} nativeData - Native-cadence rows for window summaries
 * @property {number} start
 * @property {number} end
 * @property {string[]} seriesNames
 * @property {Record<string, string>} seriesLabels
 * @property {Record<string, string>} seriesColours
 * @property {Record<string, string[]>} [groupFuelTechs] - Member fuel techs per group
 */

/**
 * A computed row of the fuel-tech table. Nulls render as em dashes — a group
 * can lack a value legitimately (no market settlement, zero energy, or an
 * inapplicable contribution mode).
 * @typedef {Object} FuelTechTableRow
 * @property {string} id - Group series id
 * @property {string} label
 * @property {string} colour
 * @property {boolean} isLoad - All-load group, rendered under the Loads heading
 * @property {boolean} hidden - Toggled off in the charts
 * @property {number | null} energyMWh - Window energy, magnitude
 * @property {number | null} avPowerMW
 * @property {number | null} contributionPct
 * @property {number | null} vwPrice - Volume-weighted price, $/MWh
 * @property {number | null} emissionsT - Window emissions, tCO₂e
 * @property {number | null} intensityKgPerMWh - Σ emissions ÷ Σ energy, kgCO₂e/MWh
 * @property {string[]} fuelTechs - Member fuel-tech codes present in the dataset
 * @property {Record<string, number | null>} [powerValues] - Average power (MW) by
 *   `powerColumns` key, when a view supplies its own columns
 */

/**
 * A curtailment row — outside the fuel-tech grouping, valued like a source
 * row against the same contribution denominator.
 * @typedef {Object} CurtailmentTableRow
 * @property {string} id
 * @property {string} label
 * @property {number} energyMWh
 * @property {number} avPowerMW
 * @property {number | null} contributionPct
 */

/**
 * Window averages behind the table's Demand and Renewables summary rows.
 * @typedef {Object} OverlaySummary
 * @property {number | null} demandEnergyMWh
 * @property {number | null} demandAvMW
 * @property {number | null} renewablesEnergyMWh
 * @property {number | null} renewablesAvMW
 * @property {number | null} renewablesSharePct
 */

/**
 * Display settings and row-toggle callbacks shared by `FuelTechPanel` and
 * `FuelTechTable` — the panel forwards them to the table untouched. The
 * grouping and contribution basis are chosen in the fuel technology options
 * dialog or from the table headers, which also cycle the value units.
 * @typedef {Object} FuelTechTableControls
 * @property {'power' | 'energy'} [basis]
 * @property {SiPrefix} [displayPrefix] - Generation chart's selected unit prefix for the active basis
 * @property {string} [group]
 * @property {string[]} [tableColumns]
 * @property {Array<{key: string, label: string}>} [powerColumns] - A view's own
 *   average-power columns in place of the window columns, filled from each row's `powerValues`
 * @property {string[]} [focusColumns] - Column keys to scroll into view and outline
 *   (a Profile breakdown's hovered day, or a percentile band's bounds)
 * @property {string} [focusRow] - Row key to highlight (the Profile breakdown's hovered card)
 * @property {string[]} [notes] - A view's own footnotes, listed last under the table
 * @property {import('./table-units.js').TableUnits} [tableUnits] - Header-chosen unit prefixes; absent columns use their defaults
 * @property {ContributionMode} [contributionMode]
 * @property {string[]} [shownCurtailment] - Curtailment series ids banded on the chart
 * @property {boolean} [showDemandLine]
 * @property {boolean} [showRenewablesLine]
 * @property {(series: string, exclusive?: boolean) => void} [ontoggle]
 * @property {(group: string) => void} [ongroupchange] - Technology header grouping menu
 * @property {(mode: ContributionMode) => void} [oncontributionchange] - Contribution header cycle
 * @property {(key: import('./table-units.js').TableUnitKey, prefix: SiPrefix) => void} [onunitchange] - Value header unit cycle
 * @property {(id: string, exclusive?: boolean) => void} [oncurtailmenttoggle]
 * @property {(exclusive?: boolean) => void} [ondemandlinetoggle]
 * @property {(exclusive?: boolean) => void} [onrenewableslinetoggle]
 */

/**
 * A chart's visible-data snapshot as the exporters consume it — the wide,
 * display-aggregated rows plus series ids and labels.
 * @typedef {Object} SeriesSnapshot
 * @property {Array<Record<string, any>>} data
 * @property {string[]} seriesNames
 * @property {Record<string, string>} seriesLabels
 */

/**
 * The timeline datasets the options menu can export, in menu order.
 * @typedef {'generation' | 'market' | 'emissions' | 'table'} ExportDatasetKey
 */

/**
 * One export column. `time` columns hold epoch ms and are formatted per
 * output (network-local text in CSV, a date-time cell in XLSX).
 * @typedef {Object} ExportColumn
 * @property {string} key - Row property
 * @property {string} header - Column header, unit included
 * @property {'time' | 'number' | 'string' | 'boolean'} type
 */

/**
 * A tabular dataset ready for either serialiser. Every tracker view exports
 * through this shape — the timeline datasets, the fuel-tech table, the
 * time-of-day profile, the two-date comparison and the region comparison.
 * @typedef {Object} ExportDataset
 * @property {ExportDatasetKey | 'profile' | 'comparison' | 'regions'} key
 * @property {string} title
 * @property {ExportColumn[]} columns
 * @property {Array<Record<string, any>>} rows
 */

/**
 * Everything the exporters need, packaged by the canvas (`getExportContext`)
 * and completed by the page (`sourceUrl`, `generatedAtMs`). Chart snapshots
 * are null until they describe the CURRENT region, grouping and metric — the
 * canvas keeps stale frames for display but never hands them to an export.
 * @typedef {Object} TrackerExportContext
 * @property {string} region
 * @property {string} regionLabel
 * @property {string} group
 * @property {string} groupLabel
 * @property {ContributionMode} contributionMode
 * @property {'power' | 'energy'} basis - Generation basis (range control's active metric)
 * @property {string} displayInterval
 * @property {string} intervalLabel
 * @property {string} rangeLabel
 * @property {string} rangeSlug - Filename-safe range, e.g. '3d' or '2026-01-01-to-2026-02-01'
 * @property {string} timeZone - Network offset, '+10:00' | '+08:00'
 * @property {{ start: number, end: number }} window - Settled viewport, epoch ms
 * @property {'market_value' | 'price' | 'price_vw'} priceMetric
 * @property {'emissions_intensity' | 'emissions'} emissionsMetric
 * @property {SeriesSnapshot | null} generation
 * @property {SeriesSnapshot | null} price
 * @property {SeriesSnapshot | null} emissions
 * @property {FuelTechTableRow[] | null} tableRows
 * @property {CurtailmentTableRow[]} curtailmentRows
 * @property {OverlaySummary | null} overlaySummary
 * @property {boolean} tablePanelOpen - The table's providers only fetch while open
 * @property {string[]} hiddenSeries - Group ids toggled off in the charts
 * @property {boolean} pending - Charts are mid-switch; the held frame is stale
 * @property {string} sourceUrl
 * @property {number} generatedAtMs
 */

/**
 * A docked side panel's controller — size, resize handlers, open/close and
 * the focus hand-off between its close control and the rail's opener.
 * @typedef {ReturnType<typeof import('$lib/components/ui/panel/docked-panel.svelte.js').createDockedPanel>} TrackerDock
 */

/**
 * `TrackerSplitLayout` panel bounds, as percentages of the container.
 * @typedef {Object} TrackerSplitConfig
 * @property {number} initial - Default width, percent of the container
 * @property {number} minPx - The panel never shrinks below this
 * @property {number} reservedPx - Chart column kept free on wide layouts
 * @property {number} maxPct
 * @property {number} narrowMaxPct - Maximum width below the wide breakpoint
 * @property {string} [storageKey] - Remember the chosen width locally
 * @property {boolean} [narrowOverlay] - Below the wide breakpoint, overlay
 *   the charts at `narrowMaxPct` (Escape closes) instead of docking beside them
 */

/**
 * One Breakdown card: a profile series on the synthetic day, in the chosen
 * style — `chart` (multi-line or percentile bands, on the full `ProfileChart`),
 * `radial` (the hourly `RadialClock`) or `ridgeline` (`Ridgeline`).
 * @typedef {Object} ProfileCard
 * @property {string} key
 * @property {string} label
 * @property {string} unit
 * @property {boolean} price - Spot price ($/MWh, stepped) rather than a technology
 * @property {{
 *   rows: TimeSeriesData[],
 *   names: string[],
 *   colours: Record<string, string>,
 *   labels: Record<string, string>,
 *   overlays: Array<{id: string, colour: string, strokeWidth?: number, label?: string}>,
 *   readout?: (row: Record<string, any>) => Array<{label: string, value: number | null, colour: string}>
 * }} [chart] - Stacked areas (`names`) with `overlays` lines, each plotting its row key
 * @property {{
 *   hours: ProfileHour[],
 *   today: ProfileHour[] | null,
 *   colour: string
 * }} [radial]
 * @property {{
 *   days: Array<{date: string, values: Array<number | null>}>,
 *   today: Array<number | null> | null,
 *   average: Array<number | null>,
 *   colour: string
 * }} [ridgeline] - One offset curve per day
 * @property {{
 *   days: Array<{date: string, values: Array<number | null>}>,
 *   colour: string
 * }} [heatmap] - One ring per day on a 24-hour dial
 */

/**
 * One hour of a profile's averages (`hourlyProfile`), for the radial clock.
 * @typedef {{hour: number, label: string, average: number | null}} ProfileHour
 */

/**
 * Average sunrise and sunset over a profile window, as hours on the network
 * clock, and the place they describe (a capital, or the capitals averaged)
 * with the capitals behind it.
 * @typedef {{sunrise: number, sunset: number, place: string, capitals: string[]}} Daylight
 */

export {};
