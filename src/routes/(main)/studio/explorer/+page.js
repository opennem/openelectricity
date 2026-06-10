/**
 * Explorer — page load.
 *
 * Resolves the URL state (region / range / interval / group, or a custom
 * start–end span) into the props the page needs, including concrete initial
 * viewport dates so a shared/bookmarked URL restores the same view. Data itself
 * is fetched client-side through `ChartDataManager` (matching the facility
 * page), so this loader stays light.
 */

import {
	RANGE_PRESETS,
	getIntervalsForRange,
	getIntervalOptionsForDays
} from '$lib/components/charts/facility/range-interval-config.js';
import { regionOptions } from '$lib/regions.js';
import { DEFAULT_GROUP, GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const FLOOR_DATE = '1998-12-01';

/**
 * URL range token → preset id.
 * @type {Record<string, string>}
 */
const RANGE_TOKEN_TO_PRESET = {
	'1d': '1D',
	'3d': '3D',
	'7d': '7D',
	'30d': '30D',
	'1y': '1Y',
	all: 'ALL'
};

/** Date string in NEM-ish local time (the 2h WEM diff is immaterial for the seed viewport). */
function toDateString(/** @type {number} */ ms) {
	return new Date(ms + 10 * 3600_000).toISOString().slice(0, 10);
}

/**
 * @param {Object} params
 * @param {URL} params.url
 */
export function load({ url }) {
	const { searchParams } = url;

	const regionValues = regionOptions.map((r) => r.value);
	let region = searchParams.get('region') || '_all';
	if (!regionValues.includes(region)) region = '_all';

	let group = searchParams.get('group') || DEFAULT_GROUP;
	if (!GROUP_OPTIONS.some((g) => g.value === group)) group = DEFAULT_GROUP;

	const now = Date.now();
	const customStart = searchParams.get('start');
	const customEnd = searchParams.get('end');

	// Custom span restored from a shared URL
	if (customStart && customEnd) {
		const startMs = new Date(customStart + 'T00:00:00').getTime();
		const endMs = new Date(customEnd + 'T23:59:59').getTime();
		if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
			const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
			const { options, default: defaultInterval } = getIntervalOptionsForDays(days);
			let intervalId = searchParams.get('interval') || defaultInterval;
			if (!options.includes(intervalId)) intervalId = defaultInterval;
			return {
				region,
				group,
				selectedRange: null,
				intervalId,
				startDate: customStart,
				endDate: customEnd
			};
		}
	}

	// Preset range
	const rangeToken = (searchParams.get('range') || '7d').toLowerCase();
	const presetId = RANGE_TOKEN_TO_PRESET[rangeToken] ?? '7D';
	const preset = RANGE_PRESETS.find((p) => p.id === presetId) ?? RANGE_PRESETS[2];

	const { options, default: defaultInterval } = getIntervalsForRange(presetId);
	let intervalId = searchParams.get('interval') || defaultInterval;
	if (!options.includes(intervalId)) intervalId = defaultInterval;

	const days =
		preset.days === -1
			? Math.max(1, Math.ceil((now - new Date(FLOOR_DATE).getTime()) / DAY_MS))
			: preset.days;

	return {
		region,
		group,
		selectedRange: preset.days,
		intervalId,
		startDate: toDateString(now - days * DAY_MS),
		endDate: toDateString(now)
	};
}
