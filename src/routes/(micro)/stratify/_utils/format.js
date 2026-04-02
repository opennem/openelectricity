/**
 * Format a date string as a relative time (e.g. "5m ago", "2d ago").
 * @param {string} dateStr
 * @returns {string}
 */
export function timeAgo(dateStr) {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diff = now - then;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
