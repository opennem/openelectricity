export const ABS_CPI_SOURCE = 'https://data.api.abs.gov.au/rest/data/ABS,CPI,2.0.0/1.10001.10.50.Q';
export const ABS_CPI_PAGE =
	'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release';
export const CPI_KV_KEY = 'abs-cpi-quarterly-v1';

/** @typedef {{period: string, value: number}} CpiObservation */
/** @typedef {{version: 1, source: string, basePeriod: string, fetchedAt: string, observations: CpiObservation[]}} CpiSnapshot */

/** @param {string} period */
function quarterNumber(period) {
	if (!/^\d{4}-Q[1-4]$/.test(period)) throw new Error('Invalid CPI quarter');
	return Number(period.slice(0, 4)) * 4 + Number(period.at(-1)) - 1;
}

/** Validate both the downloaded dataset and stored snapshots. Never fill gaps.
 * @param {any} input @param {number} [now] @returns {CpiSnapshot} */
export function validateCpiSnapshot(input, now = Date.now()) {
	if (
		input?.version !== 1 ||
		input.source !== ABS_CPI_SOURCE ||
		typeof input.basePeriod !== 'string' ||
		!input.basePeriod.trim() ||
		!Number.isFinite(Date.parse(input.fetchedAt)) ||
		Date.parse(input.fetchedAt) > now + 60_000 ||
		!Array.isArray(input.observations) ||
		!input.observations.length
	)
		throw new Error('Invalid CPI snapshot metadata');
	const date = new Date(now);
	const currentQuarter = date.getUTCFullYear() * 4 + Math.floor(date.getUTCMonth() / 3);
	let previous = -Infinity;
	for (const row of input.observations) {
		const quarter = quarterNumber(row.period);
		if (
			!Number.isFinite(row.value) ||
			row.value <= 0 ||
			quarter >= currentQuarter ||
			(previous !== -Infinity && quarter !== previous + 1)
		) {
			throw new Error('CPI observations must be positive, complete, ordered quarters');
		}
		previous = quarter;
	}
	if (quarterNumber(input.observations[0].period) > 1998 * 4) {
		throw new Error('CPI history does not cover the tracker');
	}
	return input;
}

/** Parse ABS SDMX-JSON 2.0, verifying every series dimension and the index base.
 * ABS observation arrays are not chronological: the dimension supplies their dates.
 * @param {any} payload @param {number} [now] @returns {CpiSnapshot} */
export function parseAbsCpi(payload, now = Date.now()) {
	const datasets = payload?.data?.dataSets;
	const structure = payload?.data?.structures?.[0];
	if (payload?.errors?.length || datasets?.length !== 1 || payload.data.structures.length !== 1) {
		throw new Error('Unexpected ABS CPI response');
	}
	const dataset = datasets[0];
	const entries = Object.entries(dataset.series ?? {});
	if (entries.length !== 1) throw new Error('Expected one ABS CPI series');
	const [key, series] = /** @type {[string, any]} */ (entries[0]);
	const positions = key.split(':').map(Number);
	const dimensions = structure.dimensions?.series ?? [];
	const expected = { MEASURE: '1', INDEX: '10001', TSEST: '10', REGION: '50', FREQ: 'Q' };
	if (
		dimensions.length !== 5 ||
		new Set(dimensions.map((/** @type {any} */ dimension) => dimension.id)).size !== 5 ||
		dimensions.some(
			(/** @type {any} */ dimension, /** @type {number} */ i) =>
				!(dimension.id in expected) ||
				dimension.values?.[positions[i]]?.id !==
					expected[/** @type {keyof typeof expected} */ (dimension.id)]
		)
	)
		throw new Error('Unexpected ABS CPI measure, region or frequency');
	const attributes = structure.attributes?.dataSet ?? [];
	const baseIndex = attributes.findIndex(
		(/** @type {any} */ attribute) => attribute.id === 'BASE_PERIOD'
	);
	const basePeriod = attributes[baseIndex]?.values?.[dataset.attributes?.[baseIndex]]?.name;
	const units = structure.attributes?.series ?? [];
	const unitIndex = units.findIndex(
		(/** @type {any} */ attribute) => attribute.id === 'UNIT_MEASURE'
	);
	if (units[unitIndex]?.values?.[series.attributes?.[unitIndex]]?.id !== 'IN') {
		throw new Error('ABS CPI must contain index numbers');
	}
	const time = structure.dimensions?.observation;
	if (time?.length !== 1 || time[0].id !== 'TIME_PERIOD')
		throw new Error('Invalid CPI time dimension');
	const observations = Object.entries(series.observations ?? {})
		.map(([index, value]) => ({
			period: time[0].values[Number(index)]?.id,
			value: /** @type {number[]} */ (value)[0]
		}))
		.sort((a, b) => String(a.period).localeCompare(String(b.period)));
	return validateCpiSnapshot(
		{
			version: 1,
			source: ABS_CPI_SOURCE,
			basePeriod,
			fetchedAt: new Date(now).toISOString(),
			observations
		},
		now
	);
}

/** Reject a partial or older download before replacing a known-good snapshot.
 * Revisions and whole-series rebasing are accepted together, never spliced.
 * @param {CpiSnapshot} next @param {CpiSnapshot} previous */
export function assertCpiCoverage(next, previous) {
	const nextLast = next.observations.at(-1);
	const previousLast = previous.observations.at(-1);
	if (!nextLast || !previousLast) throw new Error('Empty CPI history');
	if (
		next.observations[0].period > previous.observations[0].period ||
		nextLast.period < previousLast.period
	) {
		throw new Error('CPI update would discard existing history');
	}
}

/** @param {CpiSnapshot} snapshot */
export function comparisonCpi(snapshot) {
	const values = snapshot.observations.map(({ period, value }) => ({
		time: Date.UTC(Number(period.slice(0, 4)), (Number(period.at(-1)) - 1) * 3, 1),
		value
	}));
	const last = values.at(-1);
	if (!last) throw new Error('Empty CPI history');
	return {
		values,
		source: ABS_CPI_PAGE,
		fetchedAt: snapshot.fetchedAt,
		reference: new Date(
			Date.UTC(new Date(last.time).getUTCFullYear(), new Date(last.time).getUTCMonth() + 2, 1)
		).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
	};
}

/** Adjust monthly dollar totals before rolling/yearly aggregation.
 * @param {any[]} rows @param {ReturnType<typeof comparisonCpi>} cpi */
export function adjustComparisonInflation(rows, cpi) {
	const index = new Map(cpi.values.map((row) => [row.time, row.value]));
	const latest = cpi.values.at(-1)?.value;
	return rows.map((row) => {
		const date = new Date(row.time);
		const value = index.get(
			Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1)
		);
		return {
			...row,
			market_value_real:
				Number.isFinite(row.market_value) && latest && value
					? (row.market_value * latest) / value
					: null
		};
	});
}
