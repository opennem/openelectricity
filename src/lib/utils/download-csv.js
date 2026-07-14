/**
 * Escape a value for CSV output.
 * Wraps in double quotes if the value contains a comma, quote, or newline.
 * @param {*} value
 * @returns {string}
 */
export function escapeCsv(value) {
	if (value == null) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Trigger a CSV file download from string data.
 * Creates a temporary blob URL and anchor element, clicks it, then revokes the URL.
 *
 * @param {string} csvData - The CSV content as a string
 * @param {string} fileName - The download file name (e.g. 'data.csv')
 */
export function downloadCsv(csvData, fileName) {
	const blob = new Blob([csvData], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	a.click();
	URL.revokeObjectURL(url);
}
