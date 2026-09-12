import {
	networkTimeZoneLabel,
	offsetMsFromOffset
} from '$lib/components/charts/v2/network-time.js';

const DAY = 86_400_000;
const SLOT = 30 * 60_000;

/** The earliest last day a profile accepts — complete 5-minute days exist from here. */
export const PROFILE_MIN_DATE = '1999-01-01';

/** @param {unknown} value @returns {'timeline' | 'average' | 'daily'} */
export function normaliseProfileView(value) {
	return value === 'average' || value === 'daily' ? value : 'timeline';
}

/** @param {unknown} value @returns {7 | 14 | 28} */
export function normaliseProfileDays(value) {
	return Number(value) === 14 ? 14 : Number(value) === 28 ? 28 : 7;
}

/** @param {unknown} value */
export function normaliseProfileEnd(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
	const ms = Date.parse(`${value}T00:00:00Z`);
	return Number.isFinite(ms) &&
		new Date(ms).toISOString().slice(0, 10) === value &&
		value >= PROFILE_MIN_DATE
		? value
		: '';
}

/** Complete network-local days, half-open [start, end). Offsets deliberately ignore DST.
 * @param {number} nowMs @param {string} timeZone @param {number} days @param {string} [lastDate] */
export function profileWindow(nowMs, timeZone, days, lastDate = '') {
	const offset = offsetMsFromOffset(timeZone);
	const today = Math.floor((nowMs + offset) / DAY) * DAY;
	const requested = normaliseProfileEnd(lastDate);
	const endLocal = requested ? Math.min(Date.parse(`${requested}T00:00:00Z`) + DAY, today) : today;
	const count = normaliseProfileDays(days);
	const end = endLocal - offset;
	return {
		start: end - count * DAY,
		end,
		offset,
		lastDate: new Date(endLocal - DAY).toISOString().slice(0, 10),
		maxDate: new Date(today - DAY).toISOString().slice(0, 10),
		dates: Array.from({ length: count }, (_, i) =>
			new Date(endLocal - (count - i) * DAY).toISOString().slice(0, 10)
		)
	};
}

/** Equal-weight daily half-hour means; absent/non-finite samples never become zero.
 * Deduplicate native timestamps before bucketing so retries cannot alter weighting.
 * @param {Array<Record<string, any>>} rows @param {string} series
 * @param {ReturnType<typeof profileWindow>} window */
export function buildDailyProfile(rows, series, window) {
	const buckets = window.dates.map(() => Array.from({ length: 48 }, () => ({ sum: 0, count: 0 })));
	const unique = new Map(rows.map((row) => [row.time, row]));
	for (const [time, row] of unique) {
		if (!Number.isFinite(time) || time < window.start || time >= window.end) continue;
		const value = row[series];
		if (typeof value !== 'number' || !Number.isFinite(value)) continue;
		const day = Math.floor((time - window.start) / DAY);
		const slot = Math.floor(((time - window.start) % DAY) / SLOT);
		buckets[day][slot].sum += value;
		buckets[day][slot].count++;
	}
	return Array.from({ length: 48 }, (_, slot) => {
		const values = buckets.map((day) => (day[slot].count ? day[slot].sum / day[slot].count : null));
		const available = values.filter((value) => value !== null);
		return {
			minute: slot * 30,
			label: `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 ? '30' : '00'}`,
			values,
			samples: buckets.map((day) => day[slot].count),
			days: available.length,
			average: available.length
				? available.reduce((sum, value) => sum + value, 0) / available.length
				: null
		};
	});
}

/** Stack independently averaged technology profiles cumulatively in group
 * order, with negative power pulling the stack down, as in the main chart.
 * A missing technology leaves a gap in the entire half-hour stack: its
 * contribution is unknown, not zero. Coverage remains available per technology.
 * @param {Array<Record<string, any>>} rows @param {string[]} names
 * @param {ReturnType<typeof profileWindow>} window */
export function buildAverageDayStack(rows, names, window) {
	const profiles = names.map((name) => buildDailyProfile(rows, name, window));
	const layers = names.map((name) => ({
		name,
		points:
			/** @type {Array<{minute: number, label: string, value: number | null, days: number, y0: number | null, y1: number | null}>} */ ([])
	}));
	for (let slot = 0; slot < 48; slot++) {
		let cumulative = 0;
		const complete = profiles.every((profile) => profile[slot].average !== null);
		for (let i = 0; i < names.length; i++) {
			const { minute, label, average: value, days } = profiles[i][slot];
			let y0 = null;
			let y1 = null;
			if (complete && value !== null) {
				y0 = cumulative;
				y1 = y0 + value;
				cumulative = y1;
			}
			layers[i].points.push({ minute, label, value, days, y0, y1 });
		}
	}
	return layers;
}

/** The profile as an export dataset for the shared CSV serialiser: the
 * average, every daily value and the native sample counts behind each.
 * @param {ReturnType<typeof buildDailyProfile>} profile
 * @param {ReturnType<typeof profileWindow>} window
 * @param {{label: string, unit: string, region: string, timeZone: string}} context
 * @returns {import('./types.js').ExportDataset} */
export function profileDataset(profile, window, context) {
	const { label, unit, region, timeZone } = context;
	return {
		key: 'profile',
		title: 'Time of day',
		columns: [
			{ key: 'region', header: 'Region', type: 'string' },
			{ key: 'timeZone', header: 'Network time', type: 'string' },
			{ key: 'series', header: 'Series', type: 'string' },
			{ key: 'label', header: 'Time of day', type: 'string' },
			{ key: 'average', header: `Average (${unit})`, type: 'number' },
			{ key: 'days', header: 'Days available', type: 'number' },
			...window.dates.flatMap((date, i) => [
				{ key: `value${i}`, header: `${date} (${unit})`, type: /** @type {const} */ ('number') },
				{ key: `samples${i}`, header: `${date} samples`, type: /** @type {const} */ ('number') }
			])
		],
		rows: profile.map((row) => ({
			region,
			timeZone: networkTimeZoneLabel(timeZone),
			series: label,
			label: row.label,
			average: row.average,
			days: row.days,
			...Object.fromEntries(
				row.values.flatMap((value, i) => [
					[`value${i}`, value],
					[`samples${i}`, row.samples[i]]
				])
			)
		}))
	};
}
