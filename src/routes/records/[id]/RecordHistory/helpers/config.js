import { getFormattedDate } from '$lib/utils/formatters';

/** @type {Record<string, {ticks: number, format: (d: Date) => string, formatTick: (d: Date) => string}>} */
export let xTickValueFormatters = {
	interval: {
		ticks: 8,
		format: (/** @type {Date} */ d) => getFormattedDate(d, 'short', 'numeric', 'short', 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, undefined, 'numeric')
	},
	day: {
		ticks: 8,
		format: (/** @type {Date} */ d) => getFormattedDate(d, 'short', 'numeric', 'short', 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, undefined, 'numeric')
	},
	month: {
		ticks: 6,
		format: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, 'short', 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, undefined, 'numeric')
	},
	quarter: {
		ticks: 6,
		format: (/** @type {Date} */ d) => getFormattedDate(d, 'short', 'numeric', 'short', 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, 'short', '2-digit')
	},
	year: {
		ticks: 6,
		format: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, undefined, 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, undefined, 'numeric')
	}
};
