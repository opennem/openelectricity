import { getNumberFormat } from '$lib/utils/formatters';

/** Proportion records (`renewable_proportion`) carry this `value_unit`. */
const PROPORTION_UNIT = '%';

const proportionFormat = new Intl.NumberFormat('en-AU', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});
const wholeFormat = getNumberFormat(0);

/**
 * Fixed decimal places for a record value: proportions show one ("54.0"),
 * everything else is whole.
 * @param {string | null | undefined} unit - the record's `value_unit`
 * @returns {number}
 */
export function recordFractionDigits(unit) {
	return unit === PROPORTION_UNIT ? 1 : 0;
}

/**
 * Give a record chart's tooltip and value readouts the record's fixed decimal
 * places, keeping the y-axis ticks whole.
 * @param {import('$lib/components/charts/stores/chart.svelte.js').default} chartCxt
 * @param {string | null | undefined} unit - the record's `value_unit`
 */
export function applyRecordValueFormat(chartCxt, unit) {
	const digits = recordFractionDigits(unit);
	chartCxt.minimumFractionDigits = digits;
	chartCxt.maximumFractionDigits = digits;
	chartCxt.useFormatY = digits > 0;
	chartCxt.formatY = chartCxt.convertValue;
}

/**
 * Format a record's value for display, without its unit.
 * @param {number | null | undefined} value
 * @param {string | null | undefined} unit - the record's `value_unit`
 * @returns {string}
 */
export function formatRecordValue(value, unit) {
	if (value === null || value === undefined || isNaN(value)) {
		return '—';
	}
	return (unit === PROPORTION_UNIT ? proportionFormat : wholeFormat).format(value);
}
