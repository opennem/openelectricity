/**
 * Tooltip derivations — pure helpers shared by `ChartTooltip.svelte` (strip)
 * and `ChartTooltipFloating.svelte` (floating card).
 *
 * Keeping them rune-free means callers wrap results in their own `$derived`
 * (preserving reactivity at the call site) and the helpers stay trivially
 * unit-testable against a plain mock chart object.
 *
 * @typedef {import('./ChartStore.svelte.js').default} ChartStoreLike
 */

import { formatDayMonthYearTime } from './date-labels.js';
import { indexOfTime } from './binary-search.js';

/**
 * The currently active data row — prefers a live hover, falls back to a
 * sticky focus (click-locked) state.
 *
 * @param {ChartStoreLike} chart
 * @returns {any}
 */
export function getActiveData(chart) {
	return chart.hoverData ?? chart.focusData;
}

/**
 * Which series key the tooltip should treat as "the one under the cursor".
 * An explicit `chartTooltips.valueKey` (set by consumers that want to pin a
 * series) wins over the reactive `hoverKey`; a chart with exactly one visible
 * series pins that series — otherwise a single-line chart with the total
 * hidden (price, corridor flow) would show only the date unless the cursor
 * sat exactly on the path.
 *
 * @param {ChartStoreLike} chart
 * @returns {string | undefined}
 */
export function getValueKey(chart) {
	const pinned = chart.chartTooltips.valueKey || chart.hoverKey;
	if (pinned) return pinned;
	const names = chart.visibleSeriesNames;
	return names?.length === 1 ? names[0] : undefined;
}

/**
 * Sum of numeric values across visible series for a given row. Hidden series
 * are filtered out upstream (`visibleSeriesNames` omits them); non-numeric or
 * missing fields are skipped.
 *
 * @param {ChartStoreLike} chart
 * @param {any} activeData
 * @returns {number}
 */
export function getTotalForRow(chart, activeData) {
	if (!activeData) return 0;
	let total = 0;
	for (const name of chart.visibleSeriesNames) {
		const v = Number(activeData[name]);
		if (Number.isFinite(v)) total += v;
	}
	return total;
}

/**
 * en-AU date-time used as the default tooltip x-format when no consumer
 * formatter is in play.
 *
 * @param {Date} date
 * @param {string | undefined} timeZone
 * @returns {string}
 */
function intlTooltipDate(date, timeZone) {
	return formatDayMonthYearTime(date, timeZone ?? 'Australia/Brisbane');
}

/**
 * Resolve the formatted x-axis label for the tooltip's active row. Routes
 * category charts through `chart.formatX`. For time-based charts, calls the
 * consumer-provided `chart.formatTickX` first; if that returns a Date (i.e.
 * the default passthrough hasn't been customised), falls back to the en-AU
 * Intl format the original `formatTooltipDate` produced. Returns `''` when
 * there's nothing to format.
 *
 * @param {ChartStoreLike} chart
 * @param {any} activeData
 * @returns {string}
 */
export function getFormattedX(chart, activeData) {
	if (!activeData) return '';

	if (chart.isCategoryChart) {
		const categoryValue = activeData[chart.xKey];
		return categoryValue === undefined ? '' : chart.formatX(categoryValue);
	}

	// Consumers can hide the tooltip date/time header via the tooltips store.
	if (chart.chartTooltips?.showDate === false) return '';

	if (!activeData.date) return '';
	const asDate = activeData.date instanceof Date ? activeData.date : new Date(activeData.date);

	// Prefer a dedicated tooltip formatter — `formatTickX` is keyed to gridline
	// midpoints and returns '' for arbitrary hovered points.
	const tip = chart.formatTooltipX?.(asDate, chart.timeZone);
	if (typeof tip === 'string' && tip) return tip;

	const formatted = chart.formatTickX?.(asDate, chart.timeZone);
	if (typeof formatted === 'string') return formatted;
	return intlTooltipDate(asDate, chart.timeZone);
}

/**
 * Resolve the formatted y-axis value for the tooltip's active row. Honours
 * the consumer's `formatY` (when `useFormatY` is true) so per-card unit
 * conversions like `formatPollutantMass` flow through; falls back to
 * `convertAndFormatValue` for unconfigured charts.
 *
 * @param {ChartStoreLike} chart
 * @param {number | string | null | undefined} value
 * @returns {string}
 */
export function getFormattedY(chart, value) {
	if (value === undefined || value === null) return '';
	const n = Number(value);
	if (Number.isNaN(n)) return '';
	if (chart.formatTooltipY) return chart.formatTooltipY(n);
	return chart.useFormatY ? chart.formatY(n) : chart.convertAndFormatValue(n);
}

/**
 * @deprecated Use `getFormattedX` instead — it routes through `formatTickX`
 * with an Intl fallback so consumer formatters flow through to the tooltip.
 *
 * @param {ChartStoreLike} chart
 * @param {any} activeData
 * @returns {string}
 */
export function formatTooltipDate(chart, activeData) {
	return getFormattedX(chart, activeData);
}

/**
 * @typedef {Object} TooltipSeriesRow
 * @property {string} key
 * @property {string} label
 * @property {string | undefined} colour
 * @property {number | undefined} value - Raw numeric value; `undefined` when the row is missing the field
 * @property {string} formattedValue - Empty string when `value` is undefined
 * @property {boolean} isHovered - True when this row matches the current hover key
 */

/**
 * Build one row per visible series (in display order) for a multi-row
 * tooltip. Missing values surface as `undefined` so the consumer can render
 * a `—` fallback if it wants — the row is still included so the tooltip
 * doesn't shuffle as series come and go.
 *
 * @param {ChartStoreLike} chart
 * @param {any} activeData
 * @returns {TooltipSeriesRow[]}
 */
export function buildSeriesRows(chart, activeData) {
	if (!activeData) return [];
	const hoverKey = getValueKey(chart);

	/** @type {TooltipSeriesRow[]} */
	const rows = [];
	for (const key of chart.visibleSeriesNames) {
		const raw = activeData[key];
		const numeric = Number(raw);
		const hasValue = Number.isFinite(numeric);
		rows.push({
			key,
			label: chart.seriesLabels[key] ?? key,
			colour: chart.seriesColours[key],
			value: hasValue ? numeric : undefined,
			formattedValue: hasValue
				? (chart.formatTooltipY?.(numeric) ?? chart.convertAndFormatValue(numeric))
				: '',
			isHovered: key === hoverKey
		});
	}
	return rows;
}

/**
 * @typedef {TooltipSeriesRow & { unit: string, kind: 'line' | 'area' }} TooltipOverlayRow
 */

/**
 * Resolve one independent overlay dataset at the base chart's active time.
 * Display aggregation keeps these arrays sorted and on the same bucket
 * lattice, so an exact O(log n) join avoids showing a neighbouring bucket's
 * value across a real data gap.
 *
 * @param {any[]} data
 * @param {number} time
 * @returns {any | undefined}
 */
function overlayRowAtTime(data, time) {
	if (!Array.isArray(data) || !data.length || !Number.isFinite(time)) return undefined;
	const index = indexOfTime(data, time);
	return index < 0 ? undefined : data[index];
}

/**
 * Build floating-tooltip rows for every currently enabled line and area
 * overlay. Overlay definitions themselves are toggle-dependent, so absent
 * overlays naturally produce no tooltip rows. A definition remains visible
 * with an empty value when its series has a gap at the hovered timestamp.
 *
 * @param {ChartStoreLike} chart
 * @param {any} activeData
 * @returns {TooltipOverlayRow[]}
 */
export function buildOverlayRows(chart, activeData) {
	const time = Number(activeData?.time);
	if (!activeData || !Number.isFinite(time)) return [];

	const defaultUnit = chart.chartOptions?.displayUnit ?? '';
	/** @type {TooltipOverlayRow[]} */
	const rows = [];

	/**
	 * @param {{ key: string, label: string, colour?: string, raw: any, unit: string, kind: 'line' | 'area', formatter?: (value: number) => string }} definition
	 */
	function addRow({ key, label, colour, raw, unit, kind, formatter }) {
		const numeric = Number(raw);
		const hasValue = raw !== null && raw !== undefined && Number.isFinite(numeric);
		rows.push({
			key,
			label,
			colour,
			value: hasValue ? numeric : undefined,
			formattedValue: hasValue
				? formatter
					? formatter(numeric)
					: chart.convertAndFormatValue(numeric)
				: '',
			isHovered: false,
			unit,
			kind
		});
	}

	for (const overlay of chart.overlayAreas ?? []) {
		const row = overlayRowAtTime(overlay.data, time);
		for (const series of overlay.series ?? []) {
			addRow({
				key: `overlay-area:${overlay.id}:${series.id}`,
				label: series.label ?? series.id,
				colour: series.colour,
				raw: row?.[series.id],
				unit: series.tooltipUnit ?? defaultUnit,
				kind: 'area',
				formatter: series.formatTooltipValue
			});
		}
	}

	for (const overlay of chart.overlayLines ?? []) {
		const row = overlayRowAtTime(overlay.data, time);
		addRow({
			key: `overlay-line:${overlay.id}`,
			label: overlay.label ?? overlay.id,
			colour: overlay.colour,
			raw: row?.[overlay.valueKey],
			unit: overlay.tooltipUnit ?? (overlay.scale === 'percent' ? '%' : defaultUnit),
			kind: 'line',
			formatter: overlay.formatTooltipValue
		});
	}

	return rows;
}
