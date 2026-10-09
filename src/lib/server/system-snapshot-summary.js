import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
import { contributionSeries } from '$lib/components/charts/network/contribution.js';
import { offsetMsFromOffset } from '$lib/components/charts/v2/network-time.js';
import { regionsNemOnlyOptions, regionsWithShortLabels } from '$lib/regions.js';

/**
 * Per-region System Snapshot figures from raw OE v4 responses.
 *
 * - generation: source generation — every Detailed group except loads and
 *   imports, as Tracker Compare counts it (`contributionSeries(…, 'generation')`);
 * - intensity: emissions over the energy of every Detailed fuel tech, as
 *   Tracker's `processEmissionsIntensity` counts it, in kgCO₂e/MWh;
 * - renewables: OE's own `renewable_proportion` (renewables ÷ gross demand).
 *   Live shows the published value; the API has no rolling 12-month bucket,
 *   so annual applies OE's formula to its inputs over the window.
 *
 * The aggregate `battery` series is skipped throughout: it nets the
 * charging/discharging splits, so counting it would double-count.
 *
 * Pure: the cached loaders in `$lib/server/system-snapshot.js` fetch and store.
 */

const group = getGroup('detailed');

/** @type {Map<string, string>} */
const groupOf = new Map(
	Object.entries(group.fuelTechs).flatMap(([groupId, fuelTechs]) =>
		fuelTechs.map((fuelTech) => [fuelTech, groupId])
	)
);
const sourceGroups = new Set(
	contributionSeries(Object.keys(group.fuelTechs), loadGroupsFor(group), 'generation')
);

/** Snapshot row ids for the NEM regions (NSW, QLD, SA, TAS, VIC). */
export const NEM_SNAPSHOT_REGIONS = regionsNemOnlyOptions
	.filter((option) => option.value !== '_all')
	.map((option) => option.shortLabel);

/** @typedef {Array<[string, number | null]>} OeSeries */
/** @typedef {{ metric: string, results?: Array<{ columns?: { region?: string, fueltech?: string }, data?: OeSeries }> }} OeEntry */
/** @typedef {{ data?: OeEntry[] }} OeResponse */
/** @typedef {{ generation: number | null, renewables: number | null, intensity: number | null }} AnnualRegion */
/** @typedef {{ generation: number | null, renewables: number | null }} LiveRegion */

/**
 * The 12 complete calendar months before the current one, timezone-naive in
 * the network's local time (the OE API convention). `dateEnd` is the current
 * month's start, which the API excludes.
 * @param {string} offset - Network offset, e.g. '+10:00'
 */
export function lastTwelveMonths(offset) {
	const local = new Date(Date.now() + offsetMsFromOffset(offset));
	const year = local.getUTCFullYear();
	const month = local.getUTCMonth();
	const monthStart = (/** @type {number} */ m) =>
		new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 19);
	return { dateStart: monthStart(month - 12), dateEnd: monthStart(month) };
}

/** @param {number} numerator @param {number} denominator @param {number} scale */
function ratio(numerator, denominator, scale) {
	return Number.isFinite(numerator) && denominator > 0 ? (numerator / denominator) * scale : null;
}

/**
 * Snapshot row id for a result: its NEM region's id, or `fallback` for a
 * response that isn't split by NEM region (WEM).
 * @param {{ columns?: { region?: string } }} result @param {string | undefined} fallback
 */
function rowIdFor(result, fallback) {
	const region = result.columns?.region?.toLowerCase();
	return (region && region !== '_all' ? regionsWithShortLabels[region] : undefined) ?? fallback;
}

/**
 * The Detailed group a fuel-tech result belongs to, or undefined for one
 * outside the grouping and for the aggregate `battery`, which nets the
 * charging/discharging splits and would double-count them.
 * @param {{ columns?: { fueltech?: string } }} result
 */
function groupFor(result) {
	const fuelTech = result.columns?.fueltech;
	return fuelTech && fuelTech !== 'battery' ? groupOf.get(fuelTech) : undefined;
}

/** @param {OeSeries | undefined} data */
function sumFinite(data) {
	let total = 0;
	for (const [, value] of data ?? [])
		if (Number.isFinite(value)) total += /** @type {number} */ (value);
	return total;
}

/**
 * Each row id's series for one metric.
 * @param {OeResponse} response @param {string} metric @param {string | undefined} fallback
 * @returns {Map<string, OeSeries>}
 */
function seriesByRow(response, metric, fallback) {
	const series = new Map();
	for (const entry of response.data ?? []) {
		if (entry.metric !== metric) continue;
		for (const result of entry.results ?? []) {
			const id = rowIdFor(result, fallback);
			if (id) series.set(id, result.data ?? []);
		}
	}
	return series;
}

/**
 * OE's renewable proportion over a window: renewable generation over gross
 * demand, summed across the periods where both were reported.
 * @param {OeSeries | undefined} renewables @param {OeSeries | undefined} demandGross
 */
function windowRenewableProportion(renewables, demandGross) {
	const demand = new Map((demandGross ?? []).map(([stamp, value]) => [stamp, value]));
	let numerator = 0;
	let denominator = 0;
	for (const [stamp, value] of renewables ?? []) {
		const gross = demand.get(stamp);
		if (!Number.isFinite(value) || !Number.isFinite(gross)) continue;
		numerator += /** @type {number} */ (value);
		denominator += /** @type {number} */ (gross);
	}
	return ratio(numerator, denominator, 100);
}

/**
 * Whole-window figures per region: a 12-month request summed over its months.
 *
 * @param {OeResponse} generation - `emissions` + `energy` by region and fuel tech
 * @param {OeResponse} renewables - `generation_renewable_energy` + `demand_gross_energy` by region
 * @param {string} [fallback] - Row id for a response not split by NEM region
 * @returns {Record<string, AnnualRegion>}
 */
export function summariseAnnual(generation, renewables, fallback) {
	/** @type {Record<string, { emissions: number, energy: number, generation: number }>} */
	const totals = {};

	for (const entry of generation.data ?? []) {
		if (entry.metric !== 'emissions' && entry.metric !== 'energy') continue;
		for (const result of entry.results ?? []) {
			const id = rowIdFor(result, fallback);
			const groupId = groupFor(result);
			if (!id || !groupId) continue;
			const value = sumFinite(result.data);
			const region = (totals[id] ??= { emissions: 0, energy: 0, generation: 0 });
			if (entry.metric === 'emissions') {
				region.emissions += value;
				continue;
			}
			region.energy += value;
			if (sourceGroups.has(groupId)) region.generation += value;
		}
	}

	const renewable = seriesByRow(renewables, 'generation_renewable_energy', fallback);
	const demandGross = seriesByRow(renewables, 'demand_gross_energy', fallback);

	return Object.fromEntries(
		Object.entries(totals).map(([id, t]) => [
			id,
			{
				// MWh → GWh, the table's unit.
				generation: t.generation > 0 ? t.generation / 1000 : null,
				renewables: windowRenewableProportion(renewable.get(id), demandGross.get(id)),
				// t / MWh → kg / MWh.
				intensity: ratio(t.emissions, t.energy, 1000)
			}
		])
	);
}

/**
 * Last finite value at or before `time`. Rooftop solar is step-held with
 * nulls between its 30-minute readings, so the latest 5-minute bucket is often
 * empty; carrying its last reading forward matches what the series shows.
 * @param {OeSeries | undefined} data @param {number} time
 */
function valueAt(data, time) {
	let found = null;
	for (const [stamp, value] of data ?? []) {
		if (Date.parse(stamp) > time) break;
		if (Number.isFinite(value)) found = value;
	}
	return found;
}

/**
 * Latest-interval figures per region. Each region reads at the newest interval
 * OE has published its renewable proportion for (the last buckets fill in
 * late), so generation describes the same moment as the share beside it.
 *
 * @param {OeResponse} power - `power` by region and fuel tech
 * @param {OeResponse} proportions - `renewable_proportion` by region
 * @returns {Record<string, LiveRegion>}
 */
export function summariseLive(power, proportions) {
	/** @type {Map<string, { time: number, renewables: number }>} */
	const latest = new Map();
	for (const [id, data] of seriesByRow(proportions, 'renewable_proportion', undefined)) {
		for (const [stamp, value] of data) {
			if (Number.isFinite(value)) {
				latest.set(id, { time: Date.parse(stamp), renewables: /** @type {number} */ (value) });
			}
		}
	}

	/** @type {Record<string, number>} */
	const generation = {};
	for (const entry of power.data ?? []) {
		if (entry.metric !== 'power') continue;
		for (const result of entry.results ?? []) {
			const id = rowIdFor(result, undefined);
			const groupId = groupFor(result);
			const at = id ? latest.get(id) : undefined;
			if (!id || !at || !groupId || !sourceGroups.has(groupId)) continue;
			const value = valueAt(result.data, at.time);
			if (value !== null) generation[id] = (generation[id] ?? 0) + value;
		}
	}

	return Object.fromEntries(
		NEM_SNAPSHOT_REGIONS.map((id) => [
			id,
			{
				generation: generation[id] > 0 ? generation[id] : null,
				renewables: latest.get(id)?.renewables ?? null
			}
		])
	);
}
