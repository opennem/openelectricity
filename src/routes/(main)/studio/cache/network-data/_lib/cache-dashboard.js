/**
 * Model for the Studio network-cache dashboard: URL filter state, list query
 * construction, display formatting and refresh presentation. Plain JS so the
 * behaviour is unit-testable without rendering components.
 */

import { format as formatDate } from 'date-fns';
import { MARKET_METRIC_NAMES } from '$lib/components/charts/network/market-metric-names.js';

/** Filter vocabularies — mirror the validation sets in $lib/server/network-data.js
 *  (a server-only module this client-side model cannot import). */
export const REGION_OPTIONS = ['au', '_all', 'wem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
export const INTERVAL_OPTIONS = ['5m', '1h', '1d', '7d', '1M', '3M', '1y'];
export const METRIC_OPTIONS = [
	'power',
	'energy',
	'market_value',
	'emissions',
	'emissions_intensity',
	...Object.keys(MARKET_METRIC_NAMES)
];
export const WINDOW_OPTIONS = ['live', 'historical'];
export const FRESHNESS_OPTIONS = ['fresh', 'stale', 'expired'];

/**
 * @typedef {object} Filters
 * @property {string} region
 * @property {string} metric
 * @property {string} interval
 * @property {string} window
 * @property {string} freshness
 * @property {string} q
 * @property {number} page
 */

/**
 * @param {string | null} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveInt(value, fallback) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Read the dashboard's filter state from the page URL.
 *
 * @param {URLSearchParams} searchParams
 * @returns {Filters}
 */
export function parseFilters(searchParams) {
	return {
		region: searchParams.get('region') ?? '',
		metric: searchParams.get('metric') ?? '',
		interval: searchParams.get('interval') ?? '',
		window: searchParams.get('window') ?? '',
		freshness: searchParams.get('freshness') ?? '',
		q: searchParams.get('q') ?? '',
		page: toPositiveInt(searchParams.get('page'), 1)
	};
}

/**
 * Serialise filters for the page URL, omitting defaults.
 *
 * @param {Filters} filters
 * @param {string} [selectedKey] - Full cache key of the selected entry
 * @returns {URLSearchParams}
 */
export function filtersToSearchParams(filters, selectedKey) {
	const params = new URLSearchParams();
	for (const name of ['region', 'metric', 'interval', 'window', 'freshness', 'q']) {
		const value = filters[/** @type {keyof Filters} */ (name)];
		if (value) params.set(name, String(value));
	}
	if (filters.page > 1) params.set('page', String(filters.page));
	if (selectedKey) params.set('key', selectedKey);
	return params;
}

/**
 * Dashboard href for a filter state, preserving any selected entry.
 *
 * @param {Filters} filters
 * @param {string} [selectedKey]
 * @returns {string}
 */
export function hrefFor(filters, selectedKey) {
	const qs = filtersToSearchParams(filters, selectedKey).toString();
	return `/studio/cache/network-data${qs ? `?${qs}` : ''}`;
}

/**
 * Query string for the list endpoint (page/pageSize semantics match the API).
 *
 * @param {Filters} filters
 * @returns {string}
 */
export function listQueryString(filters) {
	const params = filtersToSearchParams(filters);
	params.delete('key');
	return params.toString();
}

/**
 * @param {number | null | undefined} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
	if (bytes == null || !Number.isFinite(bytes)) return '–';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compact duration, coarsening with size: '840 ms', '2.4 s', '35 min', '5.2 h', '3.1 d'.
 *
 * @param {number | null | undefined} ms
 * @returns {string}
 */
export function formatDuration(ms) {
	if (ms == null || !Number.isFinite(ms) || ms < 0) return '–';
	if (ms < 1000) return `${Math.round(ms)} ms`;
	if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)} s`;
	if (ms < 60 * 60 * 1000) return `${Math.round(ms / (60 * 1000))} min`;
	if (ms < 24 * 60 * 60 * 1000) return `${(ms / (60 * 60 * 1000)).toFixed(1)} h`;
	return `${(ms / (24 * 60 * 60 * 1000)).toFixed(1)} d`;
}

/**
 * @param {number | null | undefined} epochMs
 * @returns {string}
 */
export function formatTimestamp(epochMs) {
	if (!epochMs) return '–';
	return formatDate(new Date(epochMs), 'd MMM yyyy, HH:mm:ss');
}

/**
 * Freshness deadline relative to now: 'in 4 min' or '2.1 h overdue'.
 *
 * @param {number} deadlineMs
 * @param {number} [nowMs]
 * @returns {string}
 */
export function formatDeadline(deadlineMs, nowMs = Date.now()) {
	const delta = deadlineMs - nowMs;
	return delta >= 0 ? `in ${formatDuration(delta)}` : `${formatDuration(-delta)} overdue`;
}

/**
 * Historical refreshes re-fetch the complete range upstream, which can take
 * tens of seconds — require an explicit confirmation step.
 *
 * @param {{ isHistorical: boolean }} entry
 * @returns {boolean}
 */
export function needsRefreshConfirm(entry) {
	return Boolean(entry.isHistorical);
}

/**
 * @param {{ canonicalQuery: string }} entry
 * @returns {string}
 */
export function refreshConfirmMessage(entry) {
	return `Refreshing ${entry.canonicalQuery} re-fetches the complete range upstream and can take tens of seconds. Continue?`;
}

/**
 * Present a successful refresh response.
 *
 * @param {{ stored: boolean, sizeBytes: number | null, durationMs: number | null }} result
 * @returns {{ tone: 'success' | 'warning', message: string }}
 */
export function presentRefreshResult(result) {
	if (!result.stored) {
		return {
			tone: 'warning',
			message: 'Fetched upstream, but no edge cache is available in this environment to store it.'
		};
	}
	return {
		tone: 'success',
		message: `Refreshed in ${formatDuration(result.durationMs)} — ${formatBytes(result.sizeBytes)} stored in this data centre.`
	};
}

/**
 * Present a failed refresh. The thrown ApiError carries the endpoint's 502
 * body, whose `cached` field describes any preserved local entry.
 *
 * @param {{ message?: string, body?: { error?: string, cached?: { storedAt: number, status: string } | null } | null }} error
 * @returns {{ tone: 'error', message: string, preserved: string }}
 */
export function presentRefreshFailure(error) {
	const cached = error?.body?.cached ?? null;
	return {
		tone: 'error',
		message: error?.body?.error || error?.message || 'Refresh failed.',
		preserved: cached
			? `The previously cached response (stored ${formatTimestamp(cached.storedAt)}, ${cached.status}) is preserved in this data centre.`
			: 'This data centre holds no cached response for the entry.'
	};
}

/**
 * Line numbers (0-based) of pretty-printed JSON lines containing the term,
 * case-insensitively. Empty terms match nothing.
 *
 * @param {string[]} lines
 * @param {string} term
 * @param {number} [maxMatches]
 * @returns {number[]}
 */
export function jsonSearchMatches(lines, term, maxMatches = 500) {
	const needle = term.trim().toLowerCase();
	if (!needle) return [];
	/** @type {number[]} */
	const matches = [];
	for (let i = 0; i < lines.length && matches.length < maxMatches; i += 1) {
		if (lines[i].toLowerCase().includes(needle)) matches.push(i);
	}
	return matches;
}

/**
 * Download filename for an entry's payload.
 *
 * @param {string} canonicalQuery
 * @returns {string}
 */
export function jsonFilename(canonicalQuery) {
	const slug = canonicalQuery
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
	return `network-data-${slug || 'entry'}.json`;
}
