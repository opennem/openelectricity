/**
 * Compute the trend of the latest pollutant value against the average of the
 * preceding (up to) 5 years. Returns null when there aren't enough prior data
 * points to compute a meaningful baseline.
 *
 * @param {(number | null)[]} values  Year-ordered values (oldest → newest).
 * @returns {{ latest: number, average: number, delta: number, direction: 'up' | 'down' | 'flat' } | null}
 */
export function computePollutantTrend(values) {
	if (!values?.length) return null;

	const lastIdx = values.length - 1;
	const latest = values[lastIdx];
	if (latest == null) return null;

	const window = values.slice(Math.max(0, lastIdx - 5), lastIdx);
	const prior = /** @type {number[]} */ (window.filter((v) => v != null));
	if (prior.length < 2) return null;

	const average = prior.reduce((sum, v) => sum + v, 0) / prior.length;
	if (average === 0) return null;

	const delta = (latest - average) / average;
	const FLAT_THRESHOLD = 0.05;
	const direction =
		delta > FLAT_THRESHOLD ? 'up' : delta < -FLAT_THRESHOLD ? 'down' : 'flat';

	return { latest, average, delta, direction };
}
