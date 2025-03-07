/** @type {Record<string, import('openelectricity').DataInterval>} */
export let apiIntervalMap = Object.freeze({
	interval: '5m',
	day: '1d',
	'7d': '7d',
	month: '1M',
	quarter: '3M',
	year: '1y'
});

/** @type {Record<import ('openelectricity').DataMetric, {prefix: string, displayPrefix: string, allowedPrefixes: string[], baseUnit: string}>} */
export let chartOptions = Object.freeze({
	power: {
		prefix: 'M',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G'],
		baseUnit: 'W'
	},
	energy: {
		prefix: 'M',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G'],
		baseUnit: 'Wh'
	},
	emissions: {
		prefix: '',
		displayPrefix: 'k',
		allowedPrefixes: ['', 'k'],
		baseUnit: 'tCO2e'
	},
	market_value: {
		prefix: '',
		displayPrefix: '',
		allowedPrefixes: [''],
		baseUnit: 'AUD'
	}
});
