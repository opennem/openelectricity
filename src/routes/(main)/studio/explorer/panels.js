/**
 * Explorer panel registry.
 *
 * Each panel is a self-contained chart descriptor the page renders through
 * `NetworkChart`. v1 ships a fixed Generation + Price stack, but keeping them in
 * a registry is what lets the customiser (add/remove/reorder, multi-region, more
 * metrics) drop in later: the page just renders whatever list it's given.
 *
 * @typedef {Object} PanelDef
 * @property {string} id - Stable id (used in URL `panels=` lists later)
 * @property {string} title - Header label
 * @property {'power' | 'energy' | 'price'} metric - Base metric (generation flips power↔energy with the interval)
 * @property {'stacked' | 'line'} chartKind - Render style
 * @property {string} heightClass - Chart height class
 * @property {boolean} [grouped] - Whether the fuel-tech grouping selector applies
 * @property {boolean} [diverging] - Stack positive/negative independently (loads vs sources)
 * @property {boolean} [feedsTable] - Whether this panel feeds the fuel-tech table
 * @property {string} [unitLabel] - Fixed unit shown in the header (grouped panels show the interval instead)
 */

/** @type {PanelDef[]} */
export const PANELS = [
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
	}
];
