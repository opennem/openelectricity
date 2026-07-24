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

/** @type {Record<string, MarketMetricConfig>} */
export const MARKET_METRIC_CONFIG = {
	demand: {
		chartKind: 'line',
		baseUnit: 'W',
		prefix: 'M',
		seriesDefs: seriesDefsFor('demand')
	},
	demand_energy: {
		chartKind: 'line',
		baseUnit: 'Wh',
		prefix: 'M',
		seriesDefs: seriesDefsFor('demand_energy')
	},
	curtailment: {
		chartKind: 'stacked',
		baseUnit: 'W',
		prefix: 'M',
		seriesDefs: seriesDefsFor('curtailment')
	},
	curtailment_energy: {
		chartKind: 'stacked',
		baseUnit: 'Wh',
		prefix: 'M',
		seriesDefs: seriesDefsFor('curtailment_energy')
	},
	flows: {
		chartKind: 'stacked',
		baseUnit: 'W',
		prefix: 'M',
		diverging: true,
		seriesDefs: seriesDefsFor('flows')
	},
	flows_energy: {
		chartKind: 'stacked',
		baseUnit: 'Wh',
		prefix: 'M',
		diverging: true,
		seriesDefs: seriesDefsFor('flows_energy')
	}
};

/**
 * @param {string} metric
 * @returns {MarketMetricConfig | undefined}
 */
export function getMarketMetricConfig(metric) {
	return MARKET_METRIC_CONFIG[metric];
}
