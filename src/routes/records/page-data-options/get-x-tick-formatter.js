import { addYears, startOfYear, eachYearOfInterval, differenceInCalendarMonths } from 'date-fns';
import { getFormattedDate, getFormattedMonth } from '$lib/utils/formatters.js';

/**
 * @param {*[]} array
 * @param {number} x
 */
function popEveryXItem(array, x = 3) {
	const result = [array[0]];

	// Loop through the array, skipping the first and last elements
	for (let i = 1; i < array.length - 1; i++) {
		if (i % x === 0) {
			result.push(array[i]);
		}
	}

	// Add the last element back
	result.push(array[array.length - 1]);

	return result;
}

export function getMonthlyXTicks(dataset) {
	const start = dataset[0].date;
	const end = dataset[dataset.length - 1].date;

	const newEnd = startOfYear(addYears(end, 1));
	const years = eachYearOfInterval({ start, end: newEnd });

	return undefined;
}

export function getYearlyXTicks(dataset) {
	const start = dataset[0].date;
	const end = dataset[dataset.length - 1].date;

	const years = popEveryXItem(eachYearOfInterval({ start, end: end }));

	return years;
}

export function getTickXFormatter(range) {
	if (!range || range.length === 0) {
		console.log('no range');
		return (/** @type {*} */ d) => getFormattedMonth(d, undefined);
	}

	const diffMonths = differenceInCalendarMonths(range[1], range[0]);

	if (diffMonths < 6) {
		console.log('less than 6 months');
		return (/** @type {*} */ d) => getFormattedDate(d, undefined, 'numeric', 'short', '2-digit');
	}

	// if (diffMonths < 24) {
	// 	console.log('less than 24 months');
	// 	return (/** @type {*} */ d) => getFormattedDate(d, undefined, undefined, 'short', '2-digit');
	// }

	// less than 3 years
	if (diffMonths < 36) {
		console.log('less than 3 years');
		return (/** @type {*} */ d) => getFormattedDate(d, undefined, undefined, 'short', '2-digit');
	}

	// more than 10 years
	if (diffMonths > 120) {
		console.log('more than 10 years');
		return (/** @type {*} */ d) => getFormattedDate(d, undefined, undefined, undefined, 'numeric');
	}

	console.log('default formatter');
	return (/** @type {*} */ d) => getFormattedMonth(d, undefined);
}
