/**
 * Calendar bucket-boundary math for the coarse facility-chart intervals
 * (month, quarter, season, half-year, financial-year, year).
 *
 * The core `startYearMonth` works on wall-clock year/month components and is
 * timezone-agnostic and pure (easy to unit-test). `bucketStartMs` and
 * `bucketSpanHours` wrap it with the network UTC offset so bucketing happens in
 * network-local time (AEST +10 / AWST +8, both DST-free) — the same strategy
 * `aggregateToMonth` uses. Australian conventions: seasons are meteorological
 * (summer = Dec–Feb), the financial year runs July–June.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Number of calendar months each coarse bucket spans. */
const BUCKET_MONTHS = /** @type {const} */ ({
	'1M': 1,
	quarter: 3,
	'3M': 3,
	season: 3,
	half: 6,
	fy: 12,
	'1y': 12
});

/**
 * Resolve the bucket-start year/month for a given wall-clock year/month.
 *
 * @param {string} kind - 'month'|'1M'|'quarter'|'3M'|'season'|'half'|'fy'|'1y'
 * @param {number} year - full year (e.g. 2026)
 * @param {number} month0 - month index 0–11
 * @returns {{ year: number, month0: number }}
 */
export function startYearMonth(kind, year, month0) {
	switch (kind) {
		case 'quarter':
		case '3M':
			return { year, month0: Math.floor(month0 / 3) * 3 };
		case 'half':
			return { year, month0: month0 < 6 ? 0 : 6 };
		case 'fy':
			// AU financial year starts 1 July; Jan–Jun belong to the FY that
			// began the previous July.
			return month0 <= 5 ? { year: year - 1, month0: 6 } : { year, month0: 6 };
		case 'season':
			// AU meteorological seasons. Jan/Feb roll into the prior December's
			// summer bucket.
			if (month0 === 11) return { year, month0: 11 }; // Dec → summer (this year)
			if (month0 <= 1) return { year: year - 1, month0: 11 }; // Jan/Feb → prior Dec
			if (month0 <= 4) return { year, month0: 2 }; // Mar–May → autumn
			if (month0 <= 7) return { year, month0: 5 }; // Jun–Aug → winter
			return { year, month0: 8 }; // Sep–Nov → spring
		case '1y':
			return { year, month0: 0 };
		case 'month':
		case '1M':
		default:
			return { year, month0 };
	}
}

/**
 * Local wall-clock year/month for a UTC timestamp at the given network offset.
 * @param {number} timeMs
 * @param {number} offsetHours
 * @returns {{ year: number, month0: number }}
 */
function localYearMonth(timeMs, offsetHours) {
	const local = new Date(timeMs + offsetHours * HOUR_MS);
	return { year: local.getUTCFullYear(), month0: local.getUTCMonth() };
}

/**
 * UTC ms of the start of the bucket that `timeMs` falls in, in network time.
 *
 * @param {string} kind
 * @param {number} timeMs - UTC ms
 * @param {number} offsetHours - network offset (10 for NEM, 8 for WEM)
 * @returns {number}
 */
export function bucketStartMs(kind, timeMs, offsetHours) {
	const { year, month0 } = localYearMonth(timeMs, offsetHours);
	const start = startYearMonth(kind, year, month0);
	// Start of the bucket month at local midnight, expressed as UTC ms.
	return Date.UTC(start.year, start.month0, 1) - offsetHours * HOUR_MS;
}

/**
 * Whether `kind` is a calendar-aligned coarse bucket this module can lattice
 * (month/quarter/season/half/fy/year — the variable-width kinds).
 * @param {string} kind
 * @returns {boolean}
 */
export function isCalendarBucketKind(kind) {
	return kind in BUCKET_MONTHS;
}

/**
 * All bucket starts whose bucket intersects [startMs, endMs], in network time.
 * The first entry is the start of the bucket containing `startMs`, so it may
 * precede the range. Data-free — used to synthesize axis lattices over empty
 * or partially-loaded viewports.
 *
 * @param {string} kind - a calendar kind (see isCalendarBucketKind)
 * @param {number} startMs - UTC ms
 * @param {number} endMs - UTC ms
 * @param {number} offsetHours - network offset (10 for NEM, 8 for WEM)
 * @returns {number[]} bucket-start UTC ms, ascending
 */
export function bucketStartsInRange(kind, startMs, endMs, offsetHours) {
	const months = BUCKET_MONTHS[/** @type {keyof typeof BUCKET_MONTHS} */ (kind)] ?? 1;
	/** @type {number[]} */
	const starts = [];
	let t = bucketStartMs(kind, startMs, offsetHours);
	while (t <= endMs) {
		starts.push(t);
		const local = new Date(t + offsetHours * HOUR_MS);
		t = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + months, 1) - offsetHours * HOUR_MS;
	}
	return starts;
}

/**
 * Actual calendar length (hours) of the bucket that `timeMs` falls in. Used to
 * weight derived metrics (price = market_value / (power × hours)).
 *
 * @param {string} kind
 * @param {number} timeMs - UTC ms (typically a bucket-start timestamp)
 * @param {number} offsetHours
 * @returns {number}
 */
export function bucketSpanHours(kind, timeMs, offsetHours) {
	const { year, month0 } = localYearMonth(timeMs, offsetHours);
	const start = startYearMonth(kind, year, month0);
	const months = BUCKET_MONTHS[/** @type {keyof typeof BUCKET_MONTHS} */ (kind)] ?? 1;
	const startMs = Date.UTC(start.year, start.month0, 1);
	const endMs = Date.UTC(start.year, start.month0 + months, 1);
	return (endMs - startMs) / HOUR_MS;
}
