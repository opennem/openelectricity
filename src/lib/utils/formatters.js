import { format } from 'date-fns';

export const getNumberFormat = (maximumFractionDigits = 0, useGrouping = true) =>
	new Intl.NumberFormat('en-AU', {
		maximumFractionDigits,
		useGrouping
	});

export const formatFyTickX = (/** @type {Date | number} */ d) => {
	return format(d, 'yyyy');
};

export const formatValue = (/** @type {number} */ d) => {
	if (d === null || isNaN(d)) return '—';

	const formatted = getNumberFormat().format(d);
	if (formatted !== '0') {
		return formatted;
	}
	return formatted;
};
