import { describe, it, expect } from 'vitest';
import { latestStackedTotal, miniSeriesForAu, miniSeriesForRegion } from './map-minis.js';

/**
 * Region-grouped response entry (primary_grouping=network_region shape).
 * @param {string} metric
 * @param {Array<{ region: string, fueltech: string, values: Array<[string, number | null]> }>} defs
 */
function groupedEntry(metric, defs) {
	return {
		metric,
		results: defs.map(({ region, fueltech, values }) => ({
			name: `${metric}_${region}|${fueltech}`,
			columns: { region, fueltech },
			data: values
		}))
	};
}

// Six 5m samples spanning one 30m bucket.
const TIMES = [0, 5, 10, 15, 20, 25].map(
	(m) => `2026-08-05T12:${String(m).padStart(2, '0')}:00+10:00`
);
/** @param {number} value */
const flat = (value) => TIMES.map((t) => /** @type {[string, number]} */ ([t, value]));

describe('miniSeriesForRegion', () => {
	const response = {
		data: [
			groupedEntry('power', [
				{ region: 'NSW1', fueltech: 'coal_black', values: flat(5000) },
				{ region: 'NSW1', fueltech: 'coal_brown', values: flat(1000) },
				{ region: 'NSW1', fueltech: 'battery_charging', values: flat(200) },
				{ region: 'NSW1', fueltech: 'battery', values: flat(9999) },
				{ region: 'QLD1', fueltech: 'coal_black', values: flat(4000) }
			])
		]
	};

	it('extracts one region and rolls fueltechs into the Simplified groups', () => {
		const result = miniSeriesForRegion(response, { metric: 'power', region: 'NSW1' });
		expect(result).not.toBeNull();
		// coal_black + coal_brown → 'coal'; QLD series excluded
		expect(result?.data[0].coal).toBe(6000);
		expect(result?.seriesLabels.coal).toBe('Coal');
	});

	it('inverts loads for generation so they pull the stack down', () => {
		const result = miniSeriesForRegion(response, { metric: 'power', region: 'NSW1' });
		expect(result?.data[0].battery_charging).toBe(-200);
	});

	it('skips the aggregate battery series', () => {
		const result = miniSeriesForRegion(response, { metric: 'power', region: 'NSW1' });
		expect(result?.seriesNames).not.toContain('battery');
	});

	it('takes every series when region is null (single-region response)', () => {
		const wemish = {
			data: [
				{
					metric: 'power',
					results: [
						{ name: 'power_coal_black', columns: { fueltech: 'coal_black' }, data: flat(700) }
					]
				}
			]
		};
		const result = miniSeriesForRegion(wemish, { metric: 'power', region: null });
		expect(result?.data[0].coal).toBe(700);
	});

	it('does not invert loads for emissions', () => {
		const emissions = {
			data: [
				groupedEntry('emissions', [
					{ region: 'NSW1', fueltech: 'coal_black', values: flat(60) },
					{ region: 'NSW1', fueltech: 'battery_charging', values: flat(0) }
				])
			]
		};
		const result = miniSeriesForRegion(emissions, { metric: 'emissions', region: 'NSW1' });
		// Six 5m tonnes samples sum into the 30m bucket.
		expect(result?.data[0].coal).toBe(360);
		expect(result?.data[0].battery_charging).toBe(0);
	});

	it('builds a single aggregated price line per region', () => {
		const prices = {
			data: [
				{
					metric: 'price',
					results: [
						{ name: 'price_NSW1', columns: { region: 'NSW1' }, data: flat(90) },
						{ name: 'price_QLD1', columns: { region: 'QLD1' }, data: flat(50) }
					]
				}
			]
		};
		const result = miniSeriesForRegion(prices, { metric: 'price', region: 'NSW1' });
		expect(result?.seriesNames).toEqual(['price']);
		expect(result?.data[0].price).toBe(90);
	});

	it('returns null when the region has no series', () => {
		expect(miniSeriesForRegion(response, { metric: 'power', region: 'SA1' })).toBeNull();
		expect(miniSeriesForRegion({ data: [] }, { metric: 'power', region: 'NSW1' })).toBeNull();
	});
});

describe('miniSeriesForAu', () => {
	// The same six instants as TIMES, on WEM's clock: 12:00–12:25 AEST is
	// 10:00–10:25 AWST. A wall-clock join (the AU endpoint's bug) would land
	// these two hours apart; the absolute-time merge must land them together.
	const WEM_TIMES = [0, 5, 10, 15, 20, 25].map(
		(m) => `2026-08-05T10:${String(m).padStart(2, '0')}:00+08:00`
	);
	/** @param {number} value */
	const wemFlat = (value) => WEM_TIMES.map((t) => /** @type {[string, number]} */ ([t, value]));
	/** @param {Array<[string, number]>} values */
	const wemResponseWith = (values) => ({
		data: [
			{
				metric: 'power',
				results: [{ name: 'power_coal_black', columns: { fueltech: 'coal_black' }, data: values }]
			}
		]
	});

	const nemResponse = {
		data: [
			groupedEntry('power', [
				{ region: 'NSW1', fueltech: 'coal_black', values: flat(5000) },
				{ region: 'NSW1', fueltech: 'coal_brown', values: flat(1000) },
				{ region: 'QLD1', fueltech: 'coal_black', values: flat(4000) }
			])
		]
	};

	it('sums every NEM region and adds WEM on the same absolute instants', () => {
		const result = miniSeriesForAu(nemResponse, wemResponseWith(wemFlat(700)), {
			metric: 'power'
		});
		// One shared 30m bucket — a misaligned (wall-clock) join would split
		// the window into separate buckets instead.
		expect(result?.data).toHaveLength(1);
		// NSW 5000+1000 + QLD 4000 + WEM 700, all coal.
		expect(result?.data[0].coal).toBe(10700);
	});

	it('trims the merged rows to the two networks’ overlap', () => {
		// NEM covers two 30m buckets; WEM ends after the first — the second
		// bucket would cliff by WEM's contribution, so it must be trimmed off.
		const lateTimes = [30, 35, 40, 45, 50, 55].map((m) => `2026-08-05T12:${m}:00+10:00`);
		const twoBucketNem = {
			data: [
				groupedEntry('power', [
					{
						region: 'NSW1',
						fueltech: 'coal_black',
						values: [
							...flat(1000),
							...lateTimes.map((t) => /** @type {[string, number]} */ ([t, 1000]))
						]
					}
				])
			]
		};
		const result = miniSeriesForAu(twoBucketNem, wemResponseWith(wemFlat(500)), {
			metric: 'power'
		});
		expect(result?.data).toHaveLength(1);
		expect(result?.data[0].coal).toBe(1500);
	});

	it('returns null for price — no national price exists', () => {
		expect(
			miniSeriesForAu(nemResponse, wemResponseWith(wemFlat(700)), { metric: 'price' })
		).toBeNull();
	});

	it('degrades to the untrimmed NEM-only sum without a WEM response', () => {
		const result = miniSeriesForAu(nemResponse, null, { metric: 'power' });
		expect(result?.data).toHaveLength(1);
		expect(result?.data[0].coal).toBe(10000);
	});

	it('returns null when NEM produced nothing', () => {
		expect(
			miniSeriesForAu({ data: [] }, wemResponseWith(wemFlat(700)), { metric: 'power' })
		).toBeNull();
	});
});

describe('latestStackedTotal', () => {
	it('sums the newest bucket’s sources and excludes negative loads', () => {
		const processed = miniSeriesForRegion(
			{
				data: [
					groupedEntry('power', [
						{ region: 'NSW1', fueltech: 'coal_black', values: flat(5000) },
						{ region: 'NSW1', fueltech: 'battery_charging', values: flat(200) }
					])
				]
			},
			{ metric: 'power', region: 'NSW1' }
		);
		// battery_charging is inverted to −200 in the rows and must not offset
		// the coal contribution.
		expect(latestStackedTotal(processed)).toBe(5000);
	});

	it('returns null when there is nothing to show', () => {
		expect(latestStackedTotal(null)).toBeNull();
		expect(latestStackedTotal(/** @type {any} */ ({ data: [], seriesNames: [] }))).toBeNull();
		expect(
			latestStackedTotal(/** @type {any} */ ({ data: [{ time: 0, coal: 0 }], seriesNames: ['coal'] }))
		).toBeNull();
	});
});
