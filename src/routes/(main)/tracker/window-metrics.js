import {
	deriveVwPriceDisplayRows,
	VW_PRICE_SERIES_ID
} from '$lib/components/charts/network/process-price-vw.js';
import {
	deriveIntensityDisplayRows,
	INTENSITY_SERIES_ID
} from '$lib/components/charts/network/process-emissions-intensity.js';

/** @typedef {import('./types.js').GenerationSnapshot} Snapshot */
/** @typedef {{value: number, time: number, ties: number}} Extreme */

/** Min/max of complete, finite display buckets. Never replace missing members
 * with zero or count drawing-only closing points. Ties use the earliest time.
 * @param {Snapshot | null} snapshot @param {string[]} keys
 * @param {Array<Record<string, any>>} [rows] */
export function windowExtrema(snapshot, keys, rows = snapshot?.data ?? []) {
	/** @type {Extreme | null} */
	let min = null;
	/** @type {Extreme | null} */
	let max = null;
	let available = 0;
	let intervals = 0;
	for (const row of rows) {
		if (
			!snapshot ||
			row._bandClose ||
			!Number.isFinite(row.time) ||
			row.time < snapshot.start ||
			row.time > snapshot.end
		)
			continue;
		intervals++;
		if (
			!keys.length ||
			keys.some((key) => typeof row[key] !== 'number' || !Number.isFinite(row[key]))
		)
			continue;
		const value = keys.reduce((sum, key) => sum + row[key], 0);
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

/** @param {{generation: Snapshot | null, market: Snapshot | null, emissions: Snapshot | null,
 * hidden: string[], basis: 'power' | 'energy', priceMetric: 'price' | 'price_vw' | 'market_value',
 * emissionsMetric: 'emissions' | 'emissions_intensity'}} input */
export function buildWindowMetrics({
	generation,
	market,
	emissions,
	hidden,
	basis,
	priceMetric,
	emissionsMetric
}) {
	/** @param {Snapshot | null} snapshot */
	const visible = (snapshot) => snapshot?.seriesNames.filter((key) => !hidden.includes(key)) ?? [];
	const priceRatio = priceMetric === 'price_vw';
	const intensity = emissionsMetric === 'emissions_intensity';
	// Keep _bandClose when deriving ratios: the shared line helpers intentionally
	// return only chart fields, but metrics must still reject synthetic closures.
	/** @param {Snapshot | null} snapshot @param {(rows: any[]) => any[]} derive */
	const ratios = (snapshot, derive) =>
		derive(snapshot?.data ?? []).map((row, i) => ({
			...row,
			_bandClose: snapshot?.data[i]._bandClose
		}));
	return [
		{
			id: 'generation',
			label: basis === 'energy' ? 'Net energy' : 'Net power',
			unit: basis === 'energy' ? 'MWh' : 'MW',
			description:
				'Signed sum of selected technologies, including imports and negative loads. Not gross demand. Incomplete intervals are excluded.',
			...windowExtrema(generation, visible(generation))
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
					? 'Signed market value across selected technologies. Incomplete intervals are excluded.'
					: 'Regional price per displayed interval. Technology visibility does not change regional prices.',
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
		{
			id: 'emissions',
			label: intensity ? 'Emissions intensity' : 'Emissions volume',
			unit: intensity ? 'kgCO₂e/MWh' : 'tCO₂e',
			description: intensity
				? 'Emissions divided by energy per displayed interval, following selected technologies. Zero or missing energy is unavailable.'
				: 'Emissions across selected technologies per displayed interval. Incomplete intervals are excluded.',
			...windowExtrema(
				emissions,
				intensity ? [INTENSITY_SERIES_ID] : visible(emissions),
				intensity ? ratios(emissions, deriveIntensityDisplayRows) : emissions?.data
			)
		}
	];
}
