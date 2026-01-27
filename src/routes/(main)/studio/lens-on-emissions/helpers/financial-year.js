/**
 * Financial Year utilities for Australian FY (July 1 - June 30)
 */

/** @type {Record<string, number>} */
const MONTH_MAP = {
	Mar: 2,
	Jun: 5,
	Sep: 8,
	Dec: 11
};

/**
 * Parse quarter string format "Sep-04" to Date
 * @param {string} quarterStr - e.g., "Sep-04", "Dec-24", "Mar-25"
 * @returns {Date}
 */
export function parseQuarter(quarterStr) {
	const [monthStr, yearStr] = quarterStr.split('-');
	const month = MONTH_MAP[monthStr];

	if (month === undefined) {
		throw new Error(`Invalid quarter month: ${monthStr}`);
	}

	// Handle 2-digit year: 00-49 -> 2000s, 50-99 -> 1900s
	const yearNum = parseInt(yearStr, 10);
	const year = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;

	return new Date(year, month, 1);
}

/**
 * Get financial year from a date
 * Australian FY runs July 1 to June 30
 * e.g., July 2024 -> FY 2025, June 2025 -> FY 2025
 * @param {Date} date
 * @returns {number}
 */
export function getFinancialYear(date) {
	const month = date.getMonth(); // 0-indexed (0 = Jan, 6 = Jul)
	const year = date.getFullYear();
	// If month is July (6) or later, it's the next FY
	return month >= 6 ? year + 1 : year;
}

/**
 * Get the start date of a financial year
 * FY 2005 starts July 1, 2004
 * @param {number} fy - Financial year (e.g., 2005)
 * @returns {Date}
 */
export function fyStartDate(fy) {
	return new Date(fy - 1, 6, 1); // July 1 of previous calendar year
}

/**
 * Get the end date of a financial year
 * FY 2005 ends June 30, 2005
 * @param {number} fy - Financial year (e.g., 2005)
 * @returns {Date}
 */
export function fyEndDate(fy) {
	return new Date(fy, 5, 30); // June 30 of the FY year
}

/**
 * Format a date range as FY string
 * @param {number} startFY
 * @param {number} endFY
 * @returns {string}
 */
export function formatFYRange(startFY, endFY) {
	return `FY ${startFY} \u2014 ${endFY}`;
}

/**
 * Convert calendar year to mid-year date for projection data
 * Projections are annual, so we use January 1 of the year as the data point
 * (representing the end of the previous FY)
 * @param {number} year - Calendar year (e.g., 2025)
 * @returns {Date}
 */
export function yearToDate(year) {
	return new Date(year, 0, 1); // January 1
}

/**
 * Get the FY label for a calendar year in projections data
 * Calendar year 2025 in projections = FY 2025 (Jul 2024 - Jun 2025)
 * @param {number} calendarYear
 * @returns {number}
 */
export function calendarYearToFY(calendarYear) {
	return calendarYear;
}
