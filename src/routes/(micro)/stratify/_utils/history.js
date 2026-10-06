/**
 * Dates for the builder's History drawer, in the viewer's time zone.
 */

const DAY_FORMAT = new Intl.DateTimeFormat('en-AU', {
	weekday: 'short',
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

const TIME_FORMAT = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' });

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-AU', {
	day: 'numeric',
	month: 'short',
	hour: 'numeric',
	minute: '2-digit'
});

/** @param {Date} date */
function dayKey(date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * "Today", "Yesterday" or e.g. "Mon, 6 Oct 2026".
 * @param {Date} date
 * @param {Date} now
 */
function dayLabel(date, now) {
	if (dayKey(date) === dayKey(now)) return 'Today';
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';
	return DAY_FORMAT.format(date);
}

/**
 * Group revisions (newest first) under day headings, keeping their order.
 * @template {{ createdAt: string }} T
 * @param {T[]} revisions
 * @param {Date} [now]
 * @returns {Array<{ label: string, revisions: T[] }>}
 */
export function groupRevisionsByDay(revisions, now = new Date()) {
	/** @type {Array<{ key: string, label: string, revisions: T[] }>} */
	const groups = [];
	for (const revision of revisions) {
		const date = new Date(revision.createdAt);
		const key = dayKey(date);
		const last = groups[groups.length - 1];
		if (last?.key === key) last.revisions.push(revision);
		else groups.push({ key, label: dayLabel(date, now), revisions: [revision] });
	}
	return groups.map(({ label, revisions: items }) => ({ label, revisions: items }));
}

/**
 * e.g. "2:05 pm".
 * @param {string} iso
 */
export function formatRevisionTime(iso) {
	return TIME_FORMAT.format(new Date(iso));
}

/**
 * e.g. "6 Oct, 2:05 pm".
 * @param {string} iso
 */
export function formatRevisionDateTime(iso) {
	return DATE_TIME_FORMAT.format(new Date(iso));
}
