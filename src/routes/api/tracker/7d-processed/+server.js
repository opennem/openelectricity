/**
 * 7-Day Tracker API with Server-Side Processing (NEM power by fueltech).
 *
 * Fetches NEM power by fueltech from the OE API at 5-minute resolution for the
 * last 7 days and returns pre-processed, chart-ready data (via the shared
 * `processPower7d`). Used by the homepage hero and the /data-tracker page.
 *
 * Notes (OE raw shape vs. the old pre-aligned static JSON this replaced):
 *  - The OE 30m interval is rejected ("Unprocessable Entity"), so we fetch 5m
 *    and aggregate to the requested interval ourselves.
 *  - The OE API expects timezone-naive dates in NEM-local time (+10:00), so the
 *    date window is offset before being sent.
 *  - OE returns each fueltech on its own window (different start/length) and
 *    30-minute series (rooftop solar) are step-held across 5m with nulls in some
 *    slots. `alignAndFillPowerSeries` normalises both before the shared
 *    processor, otherwise the index-based time reconstruction misaligns series
 *    and `groupData`'s null→0 turns the rooftop gaps into visible dips.
 *  - OE also returns a net `battery` series (= discharging − charging) alongside
 *    the charging/discharging split; we drop it to avoid double-counting.
 */
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { transformOeToStatsData } from '$lib/oe-api/transform';
import { processPower7d } from '$lib/server/tracker/process-power-7d';

const oe = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const DAY_MS = 24 * 60 * 60 * 1000;
const STEP_MS = 5 * 60 * 1000; // OE fetch interval (5m)
const NEM_OFFSET_MS = 10 * 60 * 60 * 1000; // NEM market time is AEST (+10:00) year-round

// Rooftop solar is a 30-minute series step-held across the 5m grid; fill gaps up
// to one 30m block (5 slots) so the step is continuous, but never bridge longer
// genuine gaps / coverage edges (those stay null → 0 at the window edges).
const MAX_FILL_SLOTS = 5;

/**
 * Format a UTC millisecond instant as a timezone-naive NEM-local datetime
 * string (what the OE API expects).
 * @param {number} ms
 */
function toNemLocal(ms) {
	return new Date(ms + NEM_OFFSET_MS).toISOString().slice(0, 19);
}

/**
 * Normalise OE per-fueltech power series so they look like the pre-aligned shape
 * `processPower7d` expects:
 *  1. Pad every series onto one common 5m grid (union of all start/last) so the
 *     index→time reconstruction in `processPower7d` lines up across fueltechs.
 *  2. Bounded forward-fill short internal gaps (≤ MAX_FILL_SLOTS) to reconstruct
 *     the 30m step-hold of rooftop solar, so `groupData` doesn't turn those nulls
 *     into zeros that halve the aggregated buckets.
 *
 * @param {any[]} stats - StatsData from transformOeToStatsData (contiguous 5m each)
 * @returns {any[]}
 */
function alignAndFillPowerSeries(stats) {
	const nonEmpty = stats.filter((d) => d.history?.start && d.history.data.length);
	if (!nonEmpty.length) return stats;

	let startMs = Infinity;
	let lastMs = -Infinity;
	for (const d of nonEmpty) {
		startMs = Math.min(startMs, new Date(d.history.start).getTime());
		lastMs = Math.max(lastMs, new Date(d.history.last).getTime());
	}
	const len = Math.round((lastMs - startMs) / STEP_MS) + 1;
	const commonStart = new Date(startMs).toISOString();
	const commonLast = new Date(lastMs).toISOString();

	return stats.map((d) => {
		if (!d.history?.start || !d.history.data.length) return d;

		const offset = Math.round((new Date(d.history.start).getTime() - startMs) / STEP_MS);
		const out = new Array(len).fill(null);
		for (let j = 0; j < d.history.data.length; j++) {
			const idx = offset + j;
			if (idx >= 0 && idx < len) out[idx] = d.history.data[j];
		}

		// Bounded forward-fill: carry the last value forward across short gaps only.
		let run = 0;
		let last = /** @type {number | null} */ (null);
		for (let i = 0; i < len; i++) {
			if (out[i] == null) {
				if (last != null && run < MAX_FILL_SLOTS) {
					out[i] = last;
					run++;
				}
			} else {
				last = out[i];
				run = 0;
			}
		}

		return { ...d, history: { ...d.history, start: commonStart, last: commonLast, data: out } };
	});
}

export async function GET({ url }) {
	const startTime = performance.now();
	const targetInterval = url.searchParams.get('interval') || '30m';
	const now = Date.now();

	try {
		const { response } = await oe.getNetworkData(
			/** @type {any} */ ('NEM'),
			/** @type {any} */ (['power']),
			/** @type {any} */ ({
				interval: '5m',
				dateStart: toNemLocal(now - 7 * DAY_MS),
				dateEnd: toNemLocal(now),
				secondaryGrouping: ['fueltech']
			})
		);

		const stats = response.data[0] ? transformOeToStatsData(response.data[0]) : [];
		const powerData = stats.filter((d) => d.type === 'power' && d.fuel_tech !== 'battery');
		const aligned = alignAndFillPowerSeries(powerData);
		const processed = processPower7d(aligned, { targetInterval });

		return Response.json(
			{
				...processed,
				meta: {
					processingTimeMs: Math.round(performance.now() - startTime),
					dataPoints: processed.data.length,
					interval: targetInterval
				}
			},
			{
				headers: {
					'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
				}
			}
		);
	} catch (e) {
		console.error('Failed to fetch 7-day power from OE API:', e);
		const message = e instanceof Error ? e.message : String(e);
		return Response.json({ error: `Couldn't load 7-day power data: ${message}` }, { status: 500 });
	}
}
