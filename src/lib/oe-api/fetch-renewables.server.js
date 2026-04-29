import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

import { transformOeToStatsData } from './transform';
import energyParser from '$lib/opennem/parser';

const oe = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

// OE API caps the 1M-interval request range at 10000 days (~27 years).
// 2000-01-01 keeps us comfortably inside that window and matches the
// infographic's x-axis which already starts at year 2000.
const RENEWABLES_DATE_START = '2000-01-01';

/**
 * Fetch the legacy OpenNEM static-JSON energy data and parse it the same way
 * the homepage used to before the OE-API migration. Used as a baseline data
 * source in the calculation-method dropdown.
 *
 * @param {typeof fetch} fetchFn
 * @returns {Promise<StatsData[]>}
 */
async function fetchLegacyOpenNemFueltechStats(fetchFn) {
	try {
		const res = await fetchFn('/api/energy');
		if (!res.ok) {
			console.error(`Legacy /api/energy fetch failed: ${res.status}`);
			return [];
		}
		const json = await res.json();
		return json?.data ? energyParser(json.data) : [];
	} catch (e) {
		console.error('Failed to fetch legacy /api/energy:', e);
		return [];
	}
}

/**
 * Latest `history.last` across a set of StatsData (ISO-8601 sorts
 * lexicographically so direct comparison works for monthly timestamps).
 *
 * @param {StatsData[]} stats
 * @returns {string | null}
 */
function findLatestLastDate(stats) {
	let latest = null;
	for (const d of stats) {
		const last = d.history?.last;
		if (last && (!latest || last > latest)) latest = last;
	}
	return latest;
}

/**
 * Trim every StatsData record so its `history.last` does not extend past
 * `targetLast`. Drops any trailing months from `history.data` accordingly.
 * Records that already end on or before `targetLast` are returned as-is.
 *
 * @param {StatsData[]} stats
 * @param {string} targetLast — ISO month timestamp (e.g. '2026-03-01T00:00:00+10:00')
 * @returns {StatsData[]}
 */
function trimStatsDataToLastDate(stats, targetLast) {
	return stats.map((d) => {
		if (!d.history?.last || d.history.last <= targetLast) return d;
		const dropCount = monthsBetween(targetLast, d.history.last);
		if (dropCount <= 0) return d;
		return {
			...d,
			history: {
				...d.history,
				last: targetLast,
				data: d.history.data.slice(0, d.history.data.length - dropCount)
			}
		};
	});
}

/**
 * @param {string} earlierIso
 * @param {string} laterIso
 * @returns {number}
 */
function monthsBetween(earlierIso, laterIso) {
	const [ey, em] = earlierIso.split('T')[0].split('-').map(Number);
	const [ly, lm] = laterIso.split('T')[0].split('-').map(Number);
	return ly * 12 + (lm - 1) - (ey * 12 + (em - 1));
}

/**
 * Fetch all data sources required by the renewables calculator (fossil-fuels-
 * renewables infographic + studio comparison page). Returns the aligned
 * inputs plus the raw OE API payloads for client-side debugging.
 *
 * @param {typeof fetch} fetchFn
 */
export async function fetchRenewablesInput(fetchFn) {
	try {
		/** @type {{ method: string, network: string, metrics: string[], options: Record<string, unknown> }[]} */
		const calls = [
			{
				method: 'getMarket',
				network: 'NEM',
				metrics: ['generation_renewable_energy'],
				options: { interval: '1M', dateStart: RENEWABLES_DATE_START }
			},
			{
				method: 'getMarket',
				network: 'NEM',
				metrics: ['demand_gross_energy'],
				options: { interval: '1M', dateStart: RENEWABLES_DATE_START }
			},
			{
				method: 'getNetworkData',
				network: 'NEM',
				metrics: ['energy'],
				options: {
					interval: '1M',
					dateStart: RENEWABLES_DATE_START,
					secondaryGrouping: ['renewable']
				}
			}
		];

		const [
			generationRenewableRes,
			demandGrossRes,
			renewableGroupingRes,
			legacyFueltechStats
		] = await Promise.all([
			oe.getMarket(
				/** @type {any} */ (calls[0].network),
				/** @type {any} */ (calls[0].metrics),
				/** @type {any} */ (calls[0].options)
			),
			oe.getMarket(
				/** @type {any} */ (calls[1].network),
				/** @type {any} */ (calls[1].metrics),
				/** @type {any} */ (calls[1].options)
			),
			oe.getNetworkData(
				/** @type {any} */ (calls[2].network),
				/** @type {any} */ (calls[2].metrics),
				/** @type {any} */ (calls[2].options)
			),
			fetchLegacyOpenNemFueltechStats(fetchFn)
		]);

		const marketStatsRaw = [
			...(generationRenewableRes.response.data[0]
				? transformOeToStatsData(generationRenewableRes.response.data[0])
				: []),
			...(demandGrossRes.response.data[0]
				? transformOeToStatsData(demandGrossRes.response.data[0])
				: []),
			...(renewableGroupingRes.response.data[0]
				? transformOeToStatsData(renewableGroupingRes.response.data[0])
				: [])
		];

		// OE returns the current (incomplete) month; the legacy OpenNEM JSON only
		// publishes full months. Trim OE-derived stats to the legacy file's last
		// month so every chart on the renewables comparison page lines up at the
		// same right edge and we never plot a partial month.
		const legacyLast = findLatestLastDate(legacyFueltechStats);
		const marketStats = legacyLast
			? trimStatsDataToLastDate(marketStatsRaw, legacyLast)
			: marketStatsRaw;

		const rawPayloads = {
			generationRenewableEnergy: { call: calls[0], response: generationRenewableRes.response },
			demandGrossEnergy: { call: calls[1], response: demandGrossRes.response },
			renewableGrouping: { call: calls[2], response: renewableGroupingRes.response },
			legacyOpenNem: {
				call: { method: 'fetch', url: '/api/energy', via: 'energyParser' },
				response: { count: legacyFueltechStats.length, last: legacyLast }
			}
		};

		return {
			data: { marketStats, legacyFueltechStats },
			error: null,
			rawPayloads
		};
	} catch (e) {
		console.error('Failed to fetch renewables input from OE API:', e);
		const message = e instanceof Error ? e.message : String(e);
		return { data: null, error: `Couldn't load renewables data: ${message}`, rawPayloads: null };
	}
}
