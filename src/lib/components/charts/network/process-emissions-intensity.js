/**
 * Network emissions-intensity processing.
 *
 * `/api/network/data?metric=emissions_intensity` returns an emissions series
 * plus an energy basis in one response — `power` at sub-daily grains, `energy`
 * at daily-and-coarser. The processor collapses each to a network-wide total
 * per native bucket and normalises the basis to MWh, emitting COMPONENT rows
 * (`emissions`, `energy_mwh`), optionally retained per group for frontend
 * visibility filtering, not the ratio: components survive display
 * aggregation by summing, so the chart derives intensity per DISPLAY bucket as
 * a ratio of sums — the same semantics as the facility charts'
 * `deriveIntensityRows` — instead of a mean of ratios.
 */

import {
	collectSeriesByTimestamp,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';
import { intensityKgPerMWh } from '$lib/components/charts/facility/intensity-lines.js';

export const INTENSITY_SERIES_ID = 'intensity';
const EMISSIONS_ID = 'emissions';
const ENERGY_ID = 'energy_mwh';
const COMPONENT_META = {
	seriesNames: [EMISSIONS_ID, ENERGY_ID],
	seriesLabels: { [EMISSIONS_ID]: 'Emissions (t)', [ENERGY_ID]: 'Energy (MWh)' },
	seriesColours: { [EMISSIONS_ID]: '#594929', [ENERGY_ID]: '#888888' }
};

/**
 * @typedef {Object} ProcessEmissionsIntensityConfig
 * @property {number} intervalHours - Native bucket length in hours (converts a
 *   power basis to MWh; ignored when the basis is already energy)
 * @property {string} [networkTimezone] - Offset string (default: '+10:00')
 * @property {Record<string, string[]>} [groupMap] - Optional group id → member
 *   fuel-tech codes. When supplied, only technologies in the grouping count.
 * @property {string[]} [excludedGroups] - Group ids hidden by the caller.
 * @property {boolean} [retainGroups] - Keep grouped components for later frontend filtering.
 */

/**
 * @param {any} response - Raw OE API response ({ data: [{ metric, results }] })
 * @param {ProcessEmissionsIntensityConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processEmissionsIntensity(response, config) {
	if (!response?.data) return null;

	const {
		intervalHours,
		networkTimezone = '+10:00',
		groupMap,
		excludedGroups = [],
		retainGroups = false
	} = config;
	const excludedGroupSet = new Set(excludedGroups);
	/** @type {Record<string, string>} */
	const fuelTechToGroup = {};
	if (groupMap) {
		for (const [groupId, fuelTechs] of Object.entries(groupMap)) {
			for (const fuelTech of fuelTechs) fuelTechToGroup[fuelTech] = groupId;
		}
	}

	/**
	 * Network-wide sum of one metric's fueltech series per timestamp. The
	 * aggregate `battery` series is excluded like everywhere else — its power
	 * nets the charging/discharging splits (double-count) and its emissions
	 * are zero either way.
	 * @param {string} metricFilter
	 */
	const collectTotal = (metricFilter) =>
		collectSeriesByTimestamp(response, {
			metricFilter,
			networkTimezone,
			mode: 'sum',
			shouldInvert: () => false,
			classifySeries: (series) => {
				const fuelTech = series.columns?.fueltech || series.name;
				if (fuelTech === 'battery') return null;
				if (!groupMap) return { id: metricFilter };
				const groupId = fuelTechToGroup[fuelTech];
				return groupId && !excludedGroupSet.has(groupId)
					? { id: retainGroups ? `${metricFilter}:${groupId}` : metricFilter }
					: null;
			}
		});

	const emissions = collectTotal('emissions');
	if (emissions.seriesMaps.size === 0) return null;

	// The response carries whichever basis the route fetched for the grain.
	let basisMetric = 'power';
	let basis = collectTotal('power');
	if (basis.seriesMaps.size === 0) {
		basisMetric = 'energy';
		basis = collectTotal('energy');
	}
	if (basis.seriesMaps.size === 0) return null;

	/** @type {Map<string, Map<number, number>>} */
	const merged = new Map();
	for (const [key, values] of emissions.seriesMaps) merged.set(key, values);

	// Normalise each retained group's basis onto MWh per native bucket. Keys are
	// the bare metric or `<metric>:<group>`, so swap the metric prefix for the energy id.
	for (const [key, values] of basis.seriesMaps) {
		const energyKey = `${ENERGY_ID}${key.slice(basisMetric.length)}`;
		merged.set(
			energyKey,
			new Map(
				[...values].map(([ms, value]) => [
					ms,
					basisMetric === 'power' ? value * intervalHours : value
				])
			)
		);
	}

	/** @type {Set<number>} */
	const timestamps = new Set([...emissions.timestamps, ...basis.timestamps]);

	const seriesNames = [...merged.keys()];
	return {
		...COMPONENT_META,
		data: rowsFromSeriesMaps(merged, timestamps, seriesNames),
		seriesNames
	};
}

/** Collapse cached per-group components for a visibility selection, without
 * changing the data manager or consulting the HTTP response cache.
 * @param {Pick<NonNullable<ReturnType<typeof processEmissionsIntensity>>, 'seriesNames' | 'data'>} source
 * @param {string[]} excludedGroups
 */
export function selectIntensityComponents(source, excludedGroups) {
	const excluded = new Set(excludedGroups);
	const keysFor = (/** @type {string} */ metric) => {
		const grouped = source.seriesNames.filter(
			(key) => key.startsWith(`${metric}:`) && !excluded.has(key.slice(metric.length + 1))
		);
		// Components processed without a group map carry the bare metric id and
		// have nothing to filter; grouped components with every group hidden stay empty.
		return grouped.length === 0 && source.seriesNames.includes(metric) ? [metric] : grouped;
	};
	const emissionsKeys = keysFor(EMISSIONS_ID);
	const energyKeys = keysFor(ENERGY_ID);
	const sum = (/** @type {Record<string, any>} */ row, /** @type {string[]} */ keys) => {
		const values = keys
			.map((key) => row[key])
			.filter((value) => typeof value === 'number' && Number.isFinite(value));
		return values.length ? values.reduce((total, value) => total + value, 0) : null;
	};
	return {
		...COMPONENT_META,
		data: source.data.map((row) => ({
			date: row.date,
			time: row.time,
			emissions: sum(row, emissionsKeys),
			energy_mwh: sum(row, energyKeys)
		}))
	};
}

/**
 * Derive the intensity line from DISPLAY-aggregated component rows — a ratio
 * of sums per display bucket (tonnes → kg ×1000, ÷ MWh), nulled where there is
 * no generated energy to attribute the emissions to.
 *
 * @param {Array<{ date: any, time: number, emissions?: number | null, energy_mwh?: number | null }>} rows
 * @returns {Array<{ date: any, time: number, intensity: number | null }>}
 */
export function deriveIntensityDisplayRows(rows) {
	return rows.map((row) => {
		const emissionsTotal = typeof row.emissions === 'number' ? row.emissions : null;
		const energyMWh = typeof row.energy_mwh === 'number' ? row.energy_mwh : 0;
		return {
			date: row.date,
			time: row.time,
			intensity: intensityKgPerMWh(emissionsTotal, energyMWh)
		};
	});
}
