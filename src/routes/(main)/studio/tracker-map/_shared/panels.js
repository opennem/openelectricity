/**
 * Tracker-map panel registry — superset of the Explorer's `panels.js`.
 *
 * Adds the market metrics (demand, curtailment, flows) newly served by
 * `/api/network/data`; each renders through `NetworkChart` like the Explorer
 * panels. The prototypes render whatever subset/order they're given, which is
 * what the `modes` prototype's add/remove/reorder customiser leans on.
 *
 * @typedef {Object} PanelDef
 * @property {string} id - Stable id (used in saved views / URL lists)
 * @property {string} title - Header label
 * @property {'power' | 'energy' | 'price' | 'demand' | 'curtailment' | 'flows'} metric - Base metric
 *   (power↔energy and the `_energy` market variants flip with the interval ladder)
 * @property {'stacked' | 'line'} chartKind - Render style
 * @property {string} heightClass - Chart height class
 * @property {boolean} [grouped] - Whether the fuel-tech grouping selector applies
 * @property {boolean} [diverging] - Stack positive/negative independently
 * @property {boolean} [feedsTable] - Whether this panel feeds the fuel-tech table
 * @property {string} [unitLabel] - Fixed unit shown in the header
 */

/** @type {PanelDef[]} */
export const TRACKER_PANELS = [
	{
		id: 'generation',
		title: 'Generation',
		metric: 'power',
		chartKind: 'stacked',
		heightClass: 'h-[320px]',
		grouped: true,
		diverging: true,
		feedsTable: true
	},
	{
		id: 'price',
		title: 'Price',
		metric: 'price',
		chartKind: 'line',
		heightClass: 'h-[200px]',
		unitLabel: '$/MWh'
	},
	{
		id: 'demand',
		title: 'Demand',
		metric: 'demand',
		chartKind: 'line',
		heightClass: 'h-[160px]',
		unitLabel: 'MW'
	},
	{
		id: 'curtailment',
		title: 'Curtailment',
		metric: 'curtailment',
		chartKind: 'stacked',
		heightClass: 'h-[200px]',
		unitLabel: 'MW'
	},
	{
		id: 'flows',
		title: 'Imports / Exports',
		metric: 'flows',
		chartKind: 'stacked',
		heightClass: 'h-[200px]',
		diverging: true,
		unitLabel: 'MW'
	}
];

/** Default panel set for the dashboards. */
export const DEFAULT_PANEL_IDS = ['generation', 'price', 'demand', 'curtailment'];

/**
 * @param {string} id
 * @returns {PanelDef | undefined}
 */
export function getPanelDef(id) {
	return TRACKER_PANELS.find((p) => p.id === id);
}

/**
 * The metric union NetworkChart accepts — what `metricForPanel` resolves to.
 * @typedef {'power' | 'energy' | 'price' | 'demand' | 'demand_energy' | 'curtailment' | 'curtailment_energy' | 'flows' | 'flows_energy'} NetworkMetric
 */

/**
 * Resolve the API metric for a panel under the active power↔energy ladder:
 * generation follows the ladder directly; demand/curtailment/flows flip to
 * their `_energy` variants; price is ladder-independent.
 * @param {Pick<PanelDef, 'metric'>} panel
 * @param {'power' | 'energy'} activeMetric
 * @returns {NetworkMetric}
 */
export function metricForPanel(panel, activeMetric) {
	if (panel.metric === 'power') return activeMetric;
	if (panel.metric === 'price') return 'price';
	return /** @type {NetworkMetric} */ (
		activeMetric === 'energy' ? `${panel.metric}_energy` : panel.metric
	);
}

/**
 * Resolve a list of panel ids to defs, dropping unknown ids.
 * @param {string[]} ids
 * @returns {PanelDef[]}
 */
export function resolvePanels(ids) {
	return ids.map((id) => getPanelDef(id)).filter((p) => p !== undefined);
}
