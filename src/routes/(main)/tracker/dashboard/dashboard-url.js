import {
	applyRangeParams,
	parseRangeParams
} from '$lib/components/charts/facility/range-params.js';
import { builtinLayout, normaliseRange } from './dashboard-model.js';

/**
 * @param {URLSearchParams} params
 * @param {{ nowMs: number, validRegions: string[] }} context
 */
export function parseDashboardUrl(params, context) {
	const requestedRegion = params.get('region') || '_all';
	const region = context.validRegions.includes(requestedRegion) ? requestedRegion : '_all';
	const group = params.get('group') === 'simple' ? 'simple' : 'detailed';
	const parsedRange = parseRangeParams(params, { nowMs: context.nowMs });
	const range = normaliseRange(
		parsedRange
			? parsedRange.kind === 'preset'
				? {
						...parsedRange,
						intervalId: parsedRange.intervalId || (parsedRange.days === 7 ? '30m' : undefined)
					}
				: { ...parsedRange, intervalId: parsedRange.intervalId || '30m' }
			: null
	);
	return {
		region,
		group,
		range,
		// Layout composition belongs to a built-in preset or the current in-memory
		// custom layout. It is deliberately not read from the URL.
		panels: builtinLayout('analysis').panels,
		fullscreen: params.get('fullscreen') !== 'false'
	};
}

/**
 * Materialise compact navigation state into a URL. Panel composition is
 * intentionally excluded: it belongs to a built-in preset or the current
 * in-memory custom layout, not browser history. Delete former prototype
 * parameters when old links are revisited.
 * @param {URL} url
 * @param {{ region: string, group: string, range: any }} state
 */
export function applyDashboardUrl(url, state) {
	url.searchParams.set('region', state.region);
	if (state.group === 'simple') url.searchParams.set('group', 'simple');
	else url.searchParams.delete('group');
	const range = normaliseRange(state.range);
	if (range.kind === 'preset') {
		applyRangeParams(url.searchParams, {
			selectedRange: range.days,
			displayInterval: range.intervalId,
			viewStart: 0,
			viewEnd: 0,
			defaultRangeDays: -999
		});
	} else {
		applyRangeParams(url.searchParams, {
			selectedRange: null,
			displayInterval: range.intervalId,
			viewStart: range.startMs,
			viewEnd: range.endMs,
			defaultRangeDays: -999
		});
	}
	url.searchParams.delete('layout');
	url.searchParams.delete('view');
	return url;
}

/** @param {URL} url @param {Parameters<typeof applyDashboardUrl>[1]} state */
export function copiedDashboardUrl(url, state) {
	return applyDashboardUrl(new URL(url.href), state);
}
