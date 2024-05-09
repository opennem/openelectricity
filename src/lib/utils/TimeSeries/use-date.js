/**
 * This will return a date string in the format of YYYY-MM-DD for day/month/year intervals
 * @param {string} dateStr
 * @returns {string}
 */
export default function (dateStr) {
	return dateStr.split('T')[0];
}
