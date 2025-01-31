/** @type {Record<string, import('./types.d.ts').ChartOptions>} */
export let chartOptionsMap = Object.freeze({
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
});

/** @type {Record<import('./types.d.ts').Period, string>} */
export let periodIntervalMap = Object.freeze({
	interval: '5m',
	day: '1d',
	'7d': '7d',
	month: '1M',
	quarter: '1Q',
	year: '1Y'
});

/** @type {Record<string, string>} */
export let fuelTechGroupMap = Object.freeze({
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
});
