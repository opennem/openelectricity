import bundled from './data/abs-cpi.json';
import {
	CPI_KV_KEY,
	assertCpiCoverage,
	comparisonCpi,
	validateCpiSnapshot
} from '../comparison-cpi.js';

/** Read the durable, scheduled snapshot. No request to ABS on page loads.
 * The bundled ABS snapshot keeps development and KV outages usable.
 * @param {App.Platform | undefined} platform */
export async function loadComparisonCpi(platform) {
	const fallback = validateCpiSnapshot(bundled);
	try {
		const value = await platform?.env?.CPI_DATA?.get(CPI_KV_KEY, { type: 'json', cacheTtl: 3600 });
		if (value) {
			const snapshot = validateCpiSnapshot(value);
			assertCpiCoverage(snapshot, fallback);
			return comparisonCpi(snapshot);
		}
	} catch {
		console.warn('CPI snapshot unavailable or invalid; using bundled ABS history');
	}
	return comparisonCpi(fallback);
}
