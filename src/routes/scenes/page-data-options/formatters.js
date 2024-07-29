import { format } from 'date-fns';
import { format as d3Format } from 'd3-format';

export const formatFyTickX = (/** @type {Date | number} */ d) => {
	return format(d, 'yyyy');
};

export const formatValue = (/** @type {number} */ d) => {
	if (isNaN(d)) return '—';

	const formatted = d3Format('.0f')(d);
	if (formatted !== '0') {
		return formatted;
	}
	return formatted;
};
