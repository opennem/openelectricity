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
 * @property {string[]} fuelTechs - Member fuel-tech codes present in the dataset
 */

export {};
