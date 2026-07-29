/**
 * Chart configuration for the market metrics served by `/api/network/data`
 * beyond generation and price: what series each public metric fans out to,
 * how they render, and the unit the ChartStore should carry.
 *
 * The OE metric names each public metric reads come from
 * `market-metric-names.js` — the single source of truth shared with the server
 * route — so this module only adds presentation (id, label, colour, invert).
 *
 * Curtailment renders as "ghost generation" — the source fuel-tech colours
 * washed toward white — so curtailed energy reads as generation that could
 * have happened.
 */

import chroma from 'chroma-js';
import { fuelTechColourMap } from '$lib/theme/openelectricity';
import { MARKET_METRIC_NAMES } from './market-metric-names.js';

/** @param {string} colour */
const ghost = (colour) => chroma.mix(colour, '#ffffff', 0.45).hex();

/**
 * Presentation for each OE metric name — how the fetched series renders.
 * Adding or renaming an OE metric is one edit in `market-metric-names.js`
 * plus one entry here.
 * @type {Record<string, { id: string, label: string, colour: string, invert?: boolean }>}
 */
const METRIC_PRESENTATION = {
	demand: { id: 'demand', label: 'Demand', colour: '#353535' },
	demand_energy: { id: 'demand', label: 'Demand', colour: '#353535' },
	curtailment_solar_utility: {
		id: 'curtailment_solar',
		label: 'Solar curtailment',
		colour: ghost(fuelTechColourMap.solar_utility)
	},
	curtailment_wind: {
		id: 'curtailment_wind',
		label: 'Wind curtailment',
		colour: ghost(fuelTechColourMap.wind)
	},
	curtailment_solar_utility_energy: {
		id: 'curtailment_solar',
		label: 'Solar curtailment',
		colour: ghost(fuelTechColourMap.solar_utility)
	},
	curtailment_wind_energy: {
		id: 'curtailment_wind',
		label: 'Wind curtailment',
		colour: ghost(fuelTechColourMap.wind)
	},
	flow_imports: { id: 'imports', label: 'Imports', colour: fuelTechColourMap.imports },
	flow_exports: {
		id: 'exports',
		label: 'Exports',
		colour: fuelTechColourMap.exports,
		invert: true
	},
	flow_imports_energy: { id: 'imports', label: 'Imports', colour: fuelTechColourMap.imports },
	flow_exports_energy: {
		id: 'exports',
		label: 'Exports',
		colour: fuelTechColourMap.exports,
		invert: true
	}
};

/**
 * @param {string} publicMetric
 * @returns {import('./process-market-data.js').MarketSeriesDef[]}
 */
const seriesDefsFor = (publicMetric) =>
	MARKET_METRIC_NAMES[publicMetric].map((metric) => ({ metric, ...METRIC_PRESENTATION[metric] }));

/**
 * @typedef {Object} MarketMetricConfig
 * @property {'stacked' | 'line'} chartKind - Default render style
 * @property {string} baseUnit - ChartStore base unit
 * @property {string} prefix - ChartStore SI prefix
 * @property {boolean} [diverging] - Stack positive/negative independently
 * @property {import('./process-market-data.js').MarketSeriesDef[]} seriesDefs
 */

/**
 * Build a config entry. Every field except the render style follows mechanically
 * from the metric name: the `_energy` variants carry MWh, everything else MW,
 * and the SI prefix is always M. Spelling those out per entry is what lets a
 * power key end up declaring Wh — a mismatch nothing else would catch.
 *
 * @param {string} publicMetric
 * @param {{ chartKind?: 'stacked' | 'line', diverging?: boolean }} [options]
 * @returns {MarketMetricConfig}
 */
function marketMetricConfig(publicMetric, { chartKind = 'stacked', diverging } = {}) {
	return {
		chartKind,
		baseUnit: publicMetric.endsWith('_energy') ? 'Wh' : 'W',
		prefix: 'M',
		...(diverging ? { diverging: true } : {}),
		seriesDefs: seriesDefsFor(publicMetric)
	};
}

/**
 * Keys stay listed one per line rather than derived from `MARKET_METRIC_NAMES`,
 * so every public metric is greppable by name from this table.
 * @type {Record<string, MarketMetricConfig>}
 */
export const MARKET_METRIC_CONFIG = {
	demand: marketMetricConfig('demand', { chartKind: 'line' }),
	demand_energy: marketMetricConfig('demand_energy', { chartKind: 'line' }),
	curtailment: marketMetricConfig('curtailment'),
	curtailment_energy: marketMetricConfig('curtailment_energy'),
	curtailment_wind: marketMetricConfig('curtailment_wind'),
	curtailment_wind_energy: marketMetricConfig('curtailment_wind_energy'),
	curtailment_solar: marketMetricConfig('curtailment_solar'),
	curtailment_solar_energy: marketMetricConfig('curtailment_solar_energy'),
	flows: marketMetricConfig('flows', { diverging: true }),
	flows_energy: marketMetricConfig('flows_energy', { diverging: true })
};

/**
 * Curtailment metric per fuel-tech split, by chart basis. Spelt out rather than
 * built by convention so the keys are literal types and greppable.
 *
 * Lives here rather than with the facility-side scoping that calls it: these
 * are keys of the table above, and a rename that missed one would fall through
 * to NetworkChart's generation arm and render an empty chart. Keeping the
 * mapping next to the registry makes that drift a same-file edit.
 *
 * @typedef {'curtailment' | 'curtailment_energy' | 'curtailment_wind'
 *   | 'curtailment_wind_energy' | 'curtailment_solar' | 'curtailment_solar_energy'
 * } CurtailmentMetric
 *
 * @type {Record<'wind' | 'solar' | 'both', Record<'power' | 'energy', CurtailmentMetric>>}
 */
const CURTAILMENT_METRICS = {
	wind: { power: 'curtailment_wind', energy: 'curtailment_wind_energy' },
	solar: { power: 'curtailment_solar', energy: 'curtailment_solar_energy' },
	// A facility with both wind and utility solar units reuses the combined key,
	// which fans out to both OE splits and stacks them.
	both: { power: 'curtailment', energy: 'curtailment_energy' }
};

/**
 * Curtailment metric for a fuel-tech split, laddering power↔energy with the
 * chart's interval exactly as the generation and market charts do.
 *
 * @param {'wind' | 'solar' | 'both'} split
 * @param {'power' | 'energy'} basis
 * @returns {CurtailmentMetric}
 */
export function curtailmentMetric(split, basis) {
	return CURTAILMENT_METRICS[split][basis];
}

/**
 * @param {string} metric
 * @returns {MarketMetricConfig | undefined}
 */
export function getMarketMetricConfig(metric) {
	return MARKET_METRIC_CONFIG[metric];
}
