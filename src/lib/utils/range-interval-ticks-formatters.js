import { eachYearOfInterval } from 'date-fns';
import { getFormattedDate } from '$lib/utils/formatters';
import popEveryXItem from '$lib/utils/pop-every-x-item';

/** for each range, the ticks, format, and formatTick are defined.
 * use `default` for the default value.
 * this controls the number of x-axis ticks and the formatting of the x-axis labels and x value.
 * @type {Record<string, {ticks: Record<string, ((d?: any) => Date[] | number)>, format: Record<string, (d: Date) => string>, formatTick: Record<string, (d: Date) => string>}>} */
let rangeIntervalXFormatters = {
	'7d': {
		ticks: {
			default: () => 8
		},
		format: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
		},
		formatTick: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
		}
	},

	monthly: {
		ticks: {
			default: () => 8,
			'6M': () => 3,
			'1Y': () => 2
		},
		format: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', 'numeric'),
			'6M': (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit'),
			'1Y': (/** @type {Date} */ d) => getFormattedDate(d, undefined, undefined, 'short', '2-digit')
		},
		formatTick: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric'),
			'6M': (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit'),
			'1Y': (/** @type {Date} */ d) => getFormattedDate(d, undefined, undefined, 'short', '2-digit')
		}
	},

	'12-month-rolling': {
		ticks: {
			default: () => 5,
			'6M': () => 3
		},
		format: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit'),
			'6M': (/** @type {Date} */ d) => getFormattedDate(d, undefined, undefined, 'short', '2-digit')
		},
		formatTick: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit'),
			'6M': (/** @type {Date} */ d) => getFormattedDate(d, undefined, undefined, 'short', '2-digit')
		}
	},

	yearly: {
		ticks: {
			default: (d) => {
				if (!d || d.length === 0) return 5;
				let start = d[0].date;
				let end = d[d.length - 1].date;
				return popEveryXItem(eachYearOfInterval({ start, end }));
			}
		},
		format: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
		},
		formatTick: {
			default: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
		}
	}
};

/**
 * @param {string} range
 * @param {string} interval
 * @returns {{
 *   ticks: ((d?: any) => Date[] | number),
 *   format: (d: Date) => string,
 *   formatTick: (d: Date) => string
 * }}
 */
let rangeIntervalXFormattersGetters = (range, interval) => {
	let getters = rangeIntervalXFormatters[range];
	return {
		ticks: getters.ticks[interval] || getters.ticks.default,
		format: getters.format[interval] || getters.format.default,
		formatTick: getters.formatTick[interval] || getters.formatTick.default
	};
};

export default rangeIntervalXFormattersGetters;
