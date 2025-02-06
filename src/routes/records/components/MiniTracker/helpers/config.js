import { getFormattedDate } from '$lib/utils/formatters';

/** @type {Record<string, {ticks: number, format: (d: Date) => string, formatTick: (d: Date) => string}>} */
export let xTickValueFormatters = {
	day: {
		ticks: 8,
		format: (/** @type {Date} */ d) => getFormattedDate(d, 'short', 'numeric', 'short', 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, 'short', '2-digit')
	},
	month: {
		ticks: 6,
		format: (/** @type {Date} */ d) => getFormattedDate(d, 'short', 'numeric', 'short', 'numeric'),
		formatTick: (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, undefined, 'short', '2-digit')
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

/** @type {Record<string, import('./types').ChartOptions>} */
export let chartOptionsMap = {
	energy: {
		title: 'Energy',
		prefix: 'G',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G', 'T'],
		baseUnit: 'Wh'
	},
	emissions: {
		title: 'Emissions',
		prefix: '',
		displayPrefix: '',
		allowedPrefixes: ['', 'k'],
		baseUnit: 'tCO2e'
	}
};

/** @type {Record<import('./types').Period, string>} */
export let periodIntervalMap = {
	interval: '5m',
	day: '1d',
	'7d': '7d',
	month: '1M',
	quarter: '1Q',
	year: '1Y'
};

/** @type {Record<string, string>} */
export let fuelTechGroupMap = {
	all: 'rvf',
	demand: 'rvf',
	renewables: 'rvf',
	fossils: 'rvf',
	solar: 'simple',
	wind: 'simple',
	hydro: 'simple',
	pumps: 'simple',
	battery_charging: 'simple',
	battery_discharging: 'simple',
	coal: 'simple',
	gas: 'simple',
	bioenergy: 'simple',
	distillate: 'simple'
};
