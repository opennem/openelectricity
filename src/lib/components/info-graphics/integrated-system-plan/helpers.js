import { format as d3Format } from 'd3-format';
import { subYears, startOfYear, format } from 'date-fns';

export const formatTickX = (/** @type {Date | number} */ d) => {
	return format(subYears(d, 1), 'yyyy') + '-' + format(d, 'yy');
};

// export const formatFyTickX = (/** @type {Date | number} */ d) => 'FY' + format(d, 'yy');
export const formatFyTickX = (/** @type {Date | number} */ d) => {
	return format(d, 'yyyy');
};

export const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);

export const formatValue = (/** @type {number} */ d) => {
	const formatted = d3Format('.0f')(d);
	if (formatted !== '0') {
		return formatted;
	}
	return formatted;
};

export const displayXTicks = (d) => d.map((t) => startOfYear(t));
