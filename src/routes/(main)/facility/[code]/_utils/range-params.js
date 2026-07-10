/**
 * URL query-param (de)serialisation for the facility chart's selected range,
 * so the view is shareable/bookmarkable. Coexists with the `unit` and
 * `fullscreen` params — only the four range keys below are ever touched.
 *
 * Schema:
 * - `range`    — lowercased RANGE_PRESETS id (`1d|3d|7d|30d|1y|all`); a rolling
 *                preset re-anchored to "now" (or the retired anchor) at open time.
 * - `start`,`end` — epoch ms integers for an exact custom/panned viewport;
 *                only meaningful when `range` is absent (a valid `range` wins).
 * - `interval` — display-interval id (case-sensitive, e.g. `5m`, `1M`); written
 *                only when it differs from the preset's default, always for custom.
 *
 * The default state (default preset + its default interval) serialises to no
 * params, keeping the canonical URL clean.
 */

import {
	RANGE_PRESETS,
	getPresetByDays,
	getIntervalsForRange,
	getDefaultIntervalForRange,
	getIntervalOptionsForDays
} from '$lib/components/charts/facility/range-interval-config.js';
import { MIN_DATE } from '$lib/utils/date-range';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{ kind: 'preset', days: number, intervalId: string | null }
 *         | { kind: 'custom', startMs: number, endMs: number, intervalId: string | null }
 *         | null} ParsedRangeParams
 */

/**
 * Validate an interval id against the options offered for the range — an
 * out-of-menu interval (e.g. 5m over a year) is dropped rather than honoured,
 * so a doctored URL can't trigger a pathological fetch.
 *
 * @param {string | null} value
 * @param {string[]} options
 * @returns {string | null}
 */
function validInterval(value, options) {
	return value && options.includes(value) ? value : null;
}

/**
 * Parse the range params from a URL. Returns null when absent or invalid —
 * callers fall back to the default preset.
 *
 * @param {URLSearchParams} searchParams
 * @param {{ nowMs: number }} context - clamp ceiling for custom viewports
 * @returns {ParsedRangeParams}
 */
export function parseRangeParams(searchParams, { nowMs }) {
	const rangeParam = searchParams.get('range');
	if (rangeParam) {
		const preset = RANGE_PRESETS.find((p) => p.id.toLowerCase() === rangeParam.toLowerCase());
		if (preset) {
			return {
				kind: 'preset',
				days: preset.days,
				intervalId: validInterval(
					searchParams.get('interval'),
					getIntervalsForRange(preset.id).options
				)
			};
		}
		// Unknown preset id — ignore it and let start/end (if any) speak.
	}

	const startParam = searchParams.get('start');
	const endParam = searchParams.get('end');
	if (startParam == null || endParam == null) return null;

	let startMs = Number(startParam);
	let endMs = Number(endParam);
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
	startMs = Math.max(Math.round(startMs), new Date(MIN_DATE).getTime());
	endMs = Math.min(Math.round(endMs), nowMs);
	if (endMs <= startMs) return null;

	const spanDays = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
	return {
		kind: 'custom',
		startMs,
		endMs,
		intervalId: validInterval(
			searchParams.get('interval'),
			getIntervalOptionsForDays(spanDays).options
		)
	};
}

/**
 * Filename fragment describing the selected range — the preset id, or the
 * visible dates for a custom/panned viewport. Accepts the chart range control
 * (or any object exposing the same getters).
 *
 * @param {{ selectedRange: number | null, pickerStartDate: string, pickerEndDate: string }} range
 * @returns {string}
 */
export function rangeSlugFor(range) {
	const preset = range.selectedRange != null ? getPresetByDays(range.selectedRange) : undefined;
	if (preset) return preset.id.toLowerCase();
	return `${range.pickerStartDate}-to-${range.pickerEndDate}`;
}

/**
 * Serialise the current range state into `searchParams` (mutated in place).
 * Only the four range keys are written/removed; everything else is preserved.
 *
 * @param {URLSearchParams} searchParams
 * @param {{
 *   selectedRange: number | null,
 *   displayInterval: string,
 *   viewStart: number,
 *   viewEnd: number,
 *   defaultRangeDays: number
 * }} state - `selectedRange` is the preset day count (-1 = All), null when the
 *   viewport is custom (calendar pick or pan/zoom)
 */
export function applyRangeParams(searchParams, state) {
	const { selectedRange, displayInterval, viewStart, viewEnd, defaultRangeDays } = state;
	const preset = selectedRange != null ? getPresetByDays(selectedRange) : undefined;

	if (preset) {
		searchParams.delete('start');
		searchParams.delete('end');
		const defaultInterval = getDefaultIntervalForRange(preset.id);
		if (preset.days === defaultRangeDays && displayInterval === defaultInterval) {
			// Default state — keep the canonical URL clean.
			searchParams.delete('range');
			searchParams.delete('interval');
			return;
		}
		searchParams.set('range', preset.id.toLowerCase());
		if (displayInterval === defaultInterval) {
			searchParams.delete('interval');
		} else {
			searchParams.set('interval', displayInterval);
		}
		return;
	}

	// Custom viewport (calendar pick or pan/zoom) — exact bounds. The interval
	// is always written: the default derived from a Math.ceil'd day count could
	// drift from what's on screen across a URL round trip.
	if (!viewStart || !viewEnd) return;
	searchParams.delete('range');
	searchParams.set('start', String(Math.round(viewStart)));
	searchParams.set('end', String(Math.round(viewEnd)));
	searchParams.set('interval', displayInterval);
}
