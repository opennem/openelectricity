import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';

/** Polling is foreground-only. Returning to the tab performs one catch-up tick,
 * not a replay of the ticks missed while hidden. Existing requests may finish.
 * @param {{tick: () => void, document: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>}} options */
export function startTrackerLive({ tick, document }) {
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let timer;
	function sync() {
		clearInterval(timer);
		if (document.hidden) return;
		tick();
		timer = setInterval(() => {
			if (!document.hidden) tick();
		}, 60_000);
	}
	document.addEventListener('visibilitychange', sync);
	sync();
	return () => {
		clearInterval(timer);
		document.removeEventListener('visibilitychange', sync);
	};
}

/** Latest finite native bucket in this accepted window, not request completion
 * time or an artificial chart closing row. A partial series is not full coverage.
 * @param {import('./types.js').GenerationSnapshot | null} snapshot */
export function latestReading(snapshot) {
	let latest = null;
	if (!snapshot) return latest;
	for (const row of snapshot.nativeData) {
		if (
			row._bandClose ||
			!Number.isFinite(row.time) ||
			row.time < snapshot.start ||
			row.time > snapshot.end
		)
			continue;
		if (
			!snapshot.seriesNames.some((key) => typeof row[key] === 'number' && Number.isFinite(row[key]))
		)
			continue;
		if (latest === null || row.time > latest) latest = row.time;
	}
	return latest;
}

/** Delay is judged at the native cadence, never at a rolled-up display grain.
 * Calendar buckets are labelled as buckets, not real-time observations.
 * @param {{latest: number | null, now: number, interval: string, following: boolean, pending: boolean, error: string | null, filtered?: boolean, timeZone?: string}} input */
export function readingStatus({
	latest,
	now,
	interval,
	following,
	pending,
	error,
	filtered,
	timeZone = 'Australia/Brisbane'
}) {
	if (error) return 'Update unavailable';
	if (pending) return 'Updating…';
	if (latest === null) return 'No readings';
	if (!following || filtered) return 'Latest in view';
	const cadence = getIntervalHours(interval, latest, timeZone) * 3_600_000;
	if (now - latest > cadence * 3) return 'Data delayed';
	return ['1M', '3M', '1y'].includes(interval) ? 'Latest bucket' : 'Latest interval';
}
