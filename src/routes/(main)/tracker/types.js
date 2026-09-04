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
 * Denominator for the fuel-tech table's contribution column.
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

/**
 * Navigation state carried by the URL (plus `nowMs`, added by the page load).
 * @typedef {Object} TrackerUrlState
 * @property {string} region
 * @property {string} group - Fuel-tech grouping value
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
 * @property {number | null} avPowerMW
 * @property {number | null} contributionPct
 * @property {number | null} vwPrice - Volume-weighted price, $/MWh
 * @property {number | null} emissionsT - Window emissions, tCO₂e
 * @property {number | null} intensityKgPerMWh - Σ emissions ÷ Σ energy, kgCO₂e/MWh
 * @property {string[]} fuelTechs - Member fuel-tech codes present in the dataset
 */

/**
 * A curtailment row — outside the fuel-tech grouping, valued like a source
 * row against the same contribution denominator.
 * @typedef {Object} CurtailmentTableRow
 * @property {string} id
 * @property {string} label
 * @property {number} avPowerMW
 * @property {number | null} contributionPct
 */

/**
 * Window averages behind the table's Demand and Renewables summary rows.
 * @typedef {Object} OverlaySummary
 * @property {number | null} demandAvMW
 * @property {number | null} renewablesAvMW
 * @property {number | null} renewablesSharePct
 */

/**
 * Display settings and row-toggle callbacks shared by `FuelTechPanel` and
 * `FuelTechTable` — the panel forwards them to the table untouched. The
 * grouping and contribution basis are chosen in the page's options menu; the
 * table only displays them.
 * @typedef {Object} FuelTechTableControls
 * @property {'power' | 'energy'} [basis]
 * @property {SiPrefix} [displayPrefix] - Generation chart's selected unit prefix
 * @property {string} [group]
 * @property {ContributionMode} [contributionMode]
 * @property {string[]} [shownCurtailment] - Curtailment series ids banded on the chart
 * @property {boolean} [showDemandLine]
 * @property {boolean} [showRenewablesLine]
 * @property {(series: string, exclusive?: boolean) => void} [ontoggle]
 * @property {(id: string, exclusive?: boolean) => void} [oncurtailmenttoggle]
 * @property {(exclusive?: boolean) => void} [ondemandlinetoggle]
 * @property {(exclusive?: boolean) => void} [onrenewableslinetoggle]
 */

export {};
