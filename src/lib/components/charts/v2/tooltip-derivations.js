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
 * series) wins over the reactive `hoverKey`.
 *
 * @param {ChartStoreLike} chart
 * @returns {string | undefined}
 */
export function getValueKey(chart) {
	return chart.chartTooltips.valueKey || chart.hoverKey;
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
 * Format the active row's x-axis label for tooltip display:
 *  - category charts route through `chart.formatX`
 *  - time-based charts get a DST-free en-AU date-time (matches the legacy
 *    formatter in ChartTooltipFloating.svelte)
 * Returns `''` when there's nothing to format.
 *
 * @param {ChartStoreLike} chart
 * @param {any} activeData
 * @returns {string}
 */
export function formatTooltipDate(chart, activeData) {
	if (!activeData) return '';

	if (chart.isCategoryChart) {
		const categoryValue = activeData[chart.xKey];
		if (categoryValue === undefined) return '';
		return chart.formatX(categoryValue);
	}

	if (!activeData.date) return '';
	return new Intl.DateTimeFormat('en-AU', {
		timeZone: chart.timeZone,
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(activeData.date);
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
			formattedValue: hasValue ? chart.convertAndFormatValue(numeric) : '',
			isHovered: key === hoverKey
		});
	}
	return rows;
}
