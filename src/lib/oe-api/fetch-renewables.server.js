import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

import { transformOeToStatsData } from './transform';
import { fetchLegacyOpenNemFueltechStats } from './fetch-legacy-energy.server';
import { FOSSIL_FUEL_TECHS } from './calculate-renewables';

const oe = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

// Full available history in a single request — the OE API no longer caps the
// 1M-interval range (previously 10000 days), and NEM data starts Jan 1999.
const RENEWABLES_DATE_START = '1999-01-01';

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
			},
			{
				method: 'getNetworkData',
				network: 'NEM',
				metrics: ['energy'],
				options: {
					interval: '1M',
					dateStart: RENEWABLES_DATE_START,
					secondaryGrouping: ['fueltech']
				}
			}
		];

		const [
			generationRenewableRes,
			demandGrossRes,
			renewableGroupingRes,
			fueltechEnergyRes,
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
			oe.getNetworkData(
				/** @type {any} */ (calls[3].network),
				/** @type {any} */ (calls[3].metrics),
				/** @type {any} */ (calls[3].options)
			),
			fetchLegacyOpenNemFueltechStats(fetchFn)
		]);

		// Only the fossil fueltech rows are needed (for the fueltech-summed
		// Fossils comparison line) — drop renewables/batteries/pumps here so
		// they never reach the client payload.
		const fossilFueltechStats = (
			fueltechEnergyRes.response.data[0]
				? transformOeToStatsData(fueltechEnergyRes.response.data[0])
				: []
		).filter((d) => d.fuel_tech && FOSSIL_FUEL_TECHS.includes(d.fuel_tech));

		const marketStatsRaw = [
			...(generationRenewableRes.response.data[0]
				? transformOeToStatsData(generationRenewableRes.response.data[0])
				: []),
			...(demandGrossRes.response.data[0]
				? transformOeToStatsData(demandGrossRes.response.data[0])
				: []),
			...(renewableGroupingRes.response.data[0]
				? transformOeToStatsData(renewableGroupingRes.response.data[0])
				: []),
			...fossilFueltechStats
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
			fueltechEnergy: { call: calls[3], response: fueltechEnergyRes.response },
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

/**
 * First day of the previous calendar month as an ISO month timestamp matching
 * the pipeline's `+10:00` convention. Used to drop the in-progress current month
 * the OE 1M endpoint returns (a partial month would otherwise drag the chart's
 * trailing 12-month rolling sum down into a visible end-of-line dip).
 *
 * @returns {string}
 */
function lastCompleteMonthIso() {
	const now = new Date();
	let year = now.getUTCFullYear();
	// getUTCMonth() is the 0-based current month — i.e. the 1-based *previous*
	// month — so January (0) rolls back to December of the prior year.
	let month = now.getUTCMonth();
	if (month === 0) {
		year -= 1;
		month = 12;
	}
	return `${year}-${String(month).padStart(2, '0')}-01T00:00:00+10:00`;
}

/**
 * Lean renewables input for the homepage hero (`oe_homepage` mode). Fetches only
 * the three OE series that mode needs — renewable generation, gross demand and
 * the per-fueltech energy breakdown (filtered to fossils) — in parallel, then
 * trims the in-progress current month so the chart only ever plots full months.
 *
 * Unlike `fetchRenewablesInput` it skips the secondary_grouping=renewable call
 * and the legacy `/api/energy` fetch, so the homepage loads in a single, lighter
 * request. Returns the same `{ data: { marketStats }, error }` envelope.
 */
export async function fetchHomepageRenewablesInput() {
	try {
		const [generationRenewableRes, demandGrossRes, fueltechEnergyRes] = await Promise.all([
			oe.getMarket(
				/** @type {any} */ ('NEM'),
				/** @type {any} */ (['generation_renewable_energy']),
				/** @type {any} */ ({ interval: '1M', dateStart: RENEWABLES_DATE_START })
			),
			oe.getMarket(
				/** @type {any} */ ('NEM'),
				/** @type {any} */ (['demand_gross_energy']),
				/** @type {any} */ ({ interval: '1M', dateStart: RENEWABLES_DATE_START })
			),
			oe.getNetworkData(
				/** @type {any} */ ('NEM'),
				/** @type {any} */ (['energy']),
				/** @type {any} */ ({
					interval: '1M',
					dateStart: RENEWABLES_DATE_START,
					secondaryGrouping: ['fueltech']
				})
			)
		]);

		const fossilFueltechStats = (
			fueltechEnergyRes.response.data[0]
				? transformOeToStatsData(fueltechEnergyRes.response.data[0])
				: []
		).filter((d) => d.fuel_tech && FOSSIL_FUEL_TECHS.includes(d.fuel_tech));

		const marketStatsRaw = [
			...(generationRenewableRes.response.data[0]
				? transformOeToStatsData(generationRenewableRes.response.data[0])
				: []),
			...(demandGrossRes.response.data[0]
				? transformOeToStatsData(demandGrossRes.response.data[0])
				: []),
			...fossilFueltechStats
		];

		const marketStats = trimStatsDataToLastDate(marketStatsRaw, lastCompleteMonthIso());

		return { data: { marketStats }, error: null };
	} catch (e) {
		console.error('Failed to fetch homepage renewables input from OE API:', e);
		const message = e instanceof Error ? e.message : String(e);
		return { data: null, error: `Couldn't load renewables data: ${message}` };
	}
}
