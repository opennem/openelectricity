import { getNumberFormat } from '$lib/utils/formatters';

/**
 * @type {Object<string, string>}
 */
const formatStringsLong = {
	interval: 'dd MMM yyyy, h:mma',
	day: 'dd MMM yyyy',
	'7d': 'dd MMM yyyy',
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

/**
 * @param {FuelTechCode} fuelTech
 */
function getMaximumFractionDigits(fuelTech) {
	return fuelTech === 'renewables' ? 1 : 0;
}

/**
 *
 * @param {number} value
 * @param {FuelTechCode} fuelTech
 * @returns
 */
function formatRecordValue(value, fuelTech) {
	if (value === null || value === undefined || isNaN(value)) {
		return '—';
	}
	return getNumberFormat(0).format(value);
}

export { formatStrings, formatStringsLong, formatRecordValue };
