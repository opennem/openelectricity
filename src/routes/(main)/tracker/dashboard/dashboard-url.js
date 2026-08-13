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
		// Layout composition belongs to built-in or locally saved dashboard
		// state. It is deliberately not read from the URL.
		panels: builtinLayout('analysis').panels,
		viewId: params.get('view') || null,
		fullscreen: params.get('fullscreen') !== 'false'
	};
}

/**
 * Materialise compact navigation state into a URL. Panel composition is
 * intentionally excluded: it belongs to built-in or locally saved views, not
 * browser history. Delete the former parameter when old links are revisited.
 * @param {URL} url
 * @param {{ region: string, group: string, range: any, viewId?: string | null }} state
 * @param {{ includeViewId?: boolean }} [options]
 */
export function applyDashboardUrl(url, state, { includeViewId = true } = {}) {
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
	if (includeViewId && state.viewId) url.searchParams.set('view', state.viewId);
	else url.searchParams.delete('view');
	return url;
}

/** @param {URL} url @param {Parameters<typeof applyDashboardUrl>[1]} state */
export function copiedDashboardUrl(url, state) {
	return applyDashboardUrl(new URL(url.href), state, { includeViewId: false });
}
