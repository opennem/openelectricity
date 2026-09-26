import {
	deriveVwPriceDisplayRows,
	VW_PRICE_SERIES_ID
} from '$lib/components/charts/network/process-price-vw.js';
import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';
import { deriveIntensityDisplayRows } from '$lib/components/charts/network/process-emissions-intensity.js';
/** @typedef {Pick<import('./types.js').GenerationSnapshot, 'data' | 'start' | 'end' | 'seriesNames'>} Snapshot */
/** @typedef {{value: number, time: number, ties: number}} Extreme */

/** Actual observations inside the snapshot's bounds — never drawing-only
 * closing points or rows outside the window.
 * @param {Snapshot | null} snapshot @param {Array<Record<string, any>>} rows */
function* windowRows(snapshot, rows) {
	for (const row of rows) {
		if (
			!snapshot ||
			!isObservationRow(row) ||
			!Number.isFinite(row.time) ||
			row.time < snapshot.start ||
			row.time > snapshot.end
		)
			continue;
		yield row;
	}
}

/** The bucket's summed value, or null unless every key is finite: missing
 * members never become zero.
 * @param {Record<string, any>} row @param {string[]} keys */
function completeSum(row, keys) {
	if (
		!keys.length ||
		keys.some((key) => typeof row[key] !== 'number' || !Number.isFinite(row[key]))
	)
		return null;
	const value = keys.reduce((sum, key) => sum + row[key], 0);
	return Number.isFinite(value) ? value : null;
}

/** Min/max of complete, finite display buckets. Ties use the earliest time.
 * `scaleAt` rescales a bucket's sum by its time — MW means to MWh per bucket
 * and back — so a metric can be read in either basis.
 * @param {Snapshot | null} snapshot @param {string[]} keys
 * @param {Array<Record<string, any>>} [rows] @param {(time: number) => number} [scaleAt] */
export function windowExtrema(snapshot, keys, rows = snapshot?.data ?? [], scaleAt = () => 1) {
	/** @type {Extreme | null} */
	let min = null;
	/** @type {Extreme | null} */
	let max = null;
	let available = 0;
	let intervals = 0;
	for (const row of windowRows(snapshot, rows)) {
		intervals++;
		const sum = completeSum(row, keys);
		if (sum === null) continue;
		const value = sum * scaleAt(row.time);
		if (!Number.isFinite(value)) continue;
		available++;
		if (!min || value < min.value) min = { value, time: row.time, ties: 1 };
		else if (value === min.value)
			min = { value, time: Math.min(min.time, row.time), ties: min.ties + 1 };
		if (!max || value > max.value) max = { value, time: row.time, ties: 1 };
		else if (value === max.value)
			max = { value, time: Math.min(max.time, row.time), ties: max.ties + 1 };
	}
	return { min, max, available, intervals };
}

/** @typedef {{id: string, label: string, unit: string, description: string,
 * docs?: {href: string, label: string}}
 * & ReturnType<typeof windowExtrema>} WindowMetricGroup */

/** @param {{generation: Snapshot | null, demand: Snapshot | null, renewables: Snapshot | null, market: Snapshot | null, emissions: Snapshot | null,
 * curtailment?: Snapshot | null,
 * hidden: string[], basis: 'power' | 'energy', priceMetric: 'price' | 'price_vw' | 'market_value',
 * bucketHours?: (time: number) => number}} input - `bucketHours` is the display
 * bucket's length at a time, turning energy buckets into average power
 * @returns {WindowMetricGroup[]} */
export function buildWindowMetrics({
	generation,
	demand,
	renewables,
	market,
	emissions,
	curtailment = null,
	hidden,
	basis,
	priceMetric,
	bucketHours = () => 1
}) {
	/** @param {Snapshot | null} snapshot */
	const visible = (snapshot) => snapshot?.seriesNames.filter((key) => !hidden.includes(key)) ?? [];
	const priceRatio = priceMetric === 'price_vw';
	// Keep _bandClose when deriving ratios: the shared line helpers intentionally
	// return only chart fields, but metrics must still reject synthetic closures.
	/** @param {Snapshot | null} snapshot @param {(rows: any[]) => any[]} derive */
	const ratios = (snapshot, derive) =>
		derive(snapshot?.data ?? []).map((row, i) => ({
			...row,
			_bandClose: snapshot?.data[i]._bandClose
		}));
	return [
		// Sub-daily buckets hold MW means, so their energy would only be power
		// rescaled; energy earns a row once a bucket is a day or longer.
		...(basis === 'energy'
			? [
					{
						id: 'energy',
						label: 'Net energy',
						unit: 'MWh',
						description:
							'Selected technologies, including imports and subtracting loads, per bucket.',
						...windowExtrema(generation, visible(generation))
					}
				]
			: []),
		{
			id: 'generation',
			label: 'Net power',
			unit: 'MW',
			description:
				'Selected technologies, including imports and subtracting loads. Average power per bucket on daily and longer grains.',
			...windowExtrema(
				generation,
				visible(generation),
				generation?.data,
				basis === 'energy' ? (time) => 1 / bucketHours(time) : undefined
			)
		},
		{
			id: 'demand',
			label: 'Demand',
			unit: basis === 'energy' ? 'MWh' : 'MW',
			description: 'Regional operational demand, independent of technology selection.',
			...windowExtrema(demand, ['demand'])
		},
		{
			id: 'renewables',
			label: 'Renewables',
			unit: '%',
			docs: {
				href: 'https://docs.openelectricity.org.au/guides/renewables/',
				label: 'How renewable energy is calculated'
			},
			description: 'Renewable share of regional gross demand, independent of technology selection.',
			...windowExtrema(renewables, ['renewable_share'])
		},
		{
			id: 'market',
			label:
				priceMetric === 'market_value'
					? 'Market value'
					: priceRatio
						? 'Volume-weighted price'
						: 'Spot price',
			unit: priceMetric === 'market_value' ? '$' : '$/MWh',
			description:
				priceMetric === 'market_value'
					? 'Net market value of selected technologies.'
					: 'Regional price, independent of technology selection.',
			...windowExtrema(
				market,
				priceRatio
					? [VW_PRICE_SERIES_ID]
					: priceMetric === 'market_value'
						? visible(market)
						: (market?.seriesNames ?? []),
				priceRatio ? ratios(market, deriveVwPriceDisplayRows) : market?.data
			)
		},
		// The emissions pair reads one components feed: tonnes per bucket, and the
		// intensity chart's ratio of sums per bucket.
		{
			id: 'emissions',
			label: 'Emissions',
			unit: 'tCO₂e',
			description: 'Emissions from selected technologies.',
			...windowExtrema(emissions, ['emissions'])
		},
		{
			id: 'intensity',
			label: 'Intensity',
			unit: 'kgCO₂e/MWh',
			description: 'Emissions per unit of energy from selected technologies.',
			...windowExtrema(emissions, ['intensity'], ratios(emissions, deriveIntensityDisplayRows))
		},
		// Official curtailment series, one row each, in the window's basis.
		{
			id: 'curtailment_solar',
			label: 'Solar curtailment',
			unit: basis === 'energy' ? 'MWh' : 'MW',
			description: 'Utility solar curtailed in the region, independent of technology selection.',
			...windowExtrema(curtailment, ['curtailment_solar'])
		},
		{
			id: 'curtailment_wind',
			label: 'Wind curtailment',
			unit: basis === 'energy' ? 'MWh' : 'MW',
			description: 'Wind curtailed in the region, independent of technology selection.',
			...windowExtrema(curtailment, ['curtailment_wind'])
		}
	];
}
