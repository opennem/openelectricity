/**
 * @type {Object<string, string>}
 */
const formatStringsLong = {
	interval: 'd MMM yyyy, h:mma',
	day: 'd MMM yyyy',
	'7d': 'd MMM yyyy',
	month: 'MMM yyyy',
	quarter: 'MMM yyyy',
	season: 'MMM yyyy',
	year: 'yyyy',
	financial_year: 'yyyy'
};

/**
 * @type {Object<string, string>}
 */
const formatStrings = {
	interval: 'dd/MM/yyyy, hh:mma',
	day: 'dd/MM/yyyy',
	'7d': 'dd/MM/yyyy',
	month: 'MM/yyyy',
	quarter: 'MM/yyyy',
	season: 'MM/yyyy',
	year: 'yyyy',
	financial_year: 'yyyy'
};

export { formatStrings, formatStringsLong };
