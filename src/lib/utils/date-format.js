import { format } from 'date-fns';
import { parseDateTime, parseAbsolute, DateFormatter } from '@internationalized/date';

/**
 * Format a date based on specificity
 * @param {string | null | undefined} dateValue - The date value to format
 * @param {string | null | undefined} specificity - How specific the date is (e.g., 'day', 'month', 'year')
 * @returns {string} Formatted date string
 */
export function formatDateBySpecificity(dateValue, specificity, offset = '+10:00') {
	if (!dateValue) return '-';

	try {
		const dateStr =
			typeof dateValue === 'string'
				? dateValue.includes('Z')
					? dateValue.split('Z')[0]
					: dateValue.split('+')[0]
				: dateValue;

		// inconsistent data format, some have Z, some have +
		// assume return string is always in UTC
		let parsedZonedDate = parseAbsolute(dateStr + 'Z', offset);
		// console.log('parsedDate', dateValue, dateStr, parsedZonedDate);
		let formatter;

		if (isNaN(parsedZonedDate.toDate().getTime())) {
			return '-';
		}

		switch (specificity?.toLowerCase()) {
			case 'day':
				formatter = new DateFormatter('en-AU', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					timeZone: offset
				});
				return formatter.format(parsedZonedDate.toDate());
			case 'month':
				formatter = new DateFormatter('en-AU', {
					year: 'numeric',
					month: 'short',
					timeZone: offset
				});
				return formatter.format(parsedZonedDate.toDate());
			case 'year':
				formatter = new DateFormatter('en-AU', {
					year: 'numeric',
					timeZone: offset
				});
				return formatter.format(parsedZonedDate.toDate());
			case 'quarter':
				formatter = new DateFormatter('en-AU', {
					year: 'numeric',
					timeZone: offset
				});
				return formatter.format(parsedZonedDate.toDate());
			default:
				// If no specificity is provided, default to full date
				formatter = new DateFormatter('en-AU', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					timeZone: offset
				});
				return formatter.format(parsedZonedDate.toDate());
		}
	} catch (error) {
		console.error('Error formatting date:', error);
		return '-';
	}
}
