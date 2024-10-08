import { differenceInCalendarMonths } from 'date-fns';

import { getFormattedDate, getFormattedMonth } from '$lib/utils/formatters.js';

export default function (d, range) {
	if (!range) {
		console.log('no range');
		return getFormattedMonth(d, undefined);
	}

	const diffMonths = differenceInCalendarMonths(range[1], range[0]);

	if (diffMonths < 6) {
		// console.log('less than 6 months');
		return getFormattedDate(d, undefined, 'numeric', 'short', undefined);
	}

	if (diffMonths < 24) {
		// console.log('less than 24 months');
		return getFormattedDate(d, undefined, undefined, 'short', '2-digit');
	}

	return getFormattedMonth(d, undefined);
}
