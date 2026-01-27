/**
 * CSV parsing utilities for emissions data
 */

import { parseQuarter, getFinancialYear, yearToDate, calendarYearToFY } from './financial-year.js';
import { QUARTERLY_CSV_MAP, PROJECTIONS_CSV_MAP, SECTOR_ORDER } from './config.js';

/**
 * @typedef {Object} EmissionsDataPointBase
 * @property {Date} date
 * @property {number} time - Unix timestamp in milliseconds
 * @property {number} fy - Financial year
 * @property {'quarterly' | 'annual'} interval
 * @property {'history' | 'current' | 'projection'} dataType
 * @property {number} net_total
 */

/**
 * @typedef {EmissionsDataPointBase & Record<string, number | Date | string>} EmissionsDataPoint
 */

/**
 * Parse a numeric value, handling whitespace
 * @param {string} value
 * @returns {number}
 */
function parseNumber(value) {
	if (value === undefined || value === null || value === '') return 0;
	const cleaned = String(value).trim().replace(/,/g, '');
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
}

/**
 * Calculate net total from sector values
 * @param {Record<string, number>} sectors
 * @returns {number}
 */
function calculateNetTotal(sectors) {
	return SECTOR_ORDER.reduce((sum, key) => sum + (sectors[key] || 0), 0);
}

/**
 * Determine data type based on financial year
 * @param {number} fy
 * @returns {'history' | 'current' | 'projection'}
 */
function getDataType(fy) {
	if (fy <= 2004) return 'history';
	if (fy >= 2026) return 'projection';
	return 'current';
}

/**
 * Parse quarterly emissions CSV
 * Format: Quarter,Electricity,Stationary,Transport,Fugitives,Industrial,Agriculture,Waste,Land sector
 * Values are already in MtCO2e
 *
 * @param {string} text - CSV text content
 * @returns {EmissionsDataPoint[]}
 */
export function parseQuarterlyCSV(text) {
	const lines = text.trim().split('\n');
	if (lines.length < 2) return [];

	const headers = lines[0].split(',').map((h) => h.trim());
	const data = [];

	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(',');
		if (values.length < 2) continue;

		const quarterStr = values[0].trim();
		const date = parseQuarter(quarterStr);
		const fy = getFinancialYear(date);

		/** @type {Record<string, number>} */
		const sectors = {};

		// Map CSV columns to internal keys
		for (let j = 1; j < headers.length; j++) {
			const csvColumn = headers[j].trim();
			const internalKey = QUARTERLY_CSV_MAP[csvColumn];
			if (internalKey) {
				sectors[internalKey] = parseNumber(values[j]);
			}
		}

		data.push({
			date,
			time: date.getTime(),
			fy,
			interval: /** @type {'quarterly'} */ ('quarterly'),
			dataType: getDataType(fy),
			...sectors,
			net_total: calculateNetTotal(sectors)
		});
	}

	// Sort by date
	return data.sort((a, b) => a.time - b.time);
}

/**
 * Parse projections CSV (transposed format)
 * Format: Sector,1990,1991,...,2040
 * Values are in tonnes (need to convert to MtCO2e by dividing by 1,000,000)
 *
 * @param {string} text - CSV text content
 * @returns {EmissionsDataPoint[]}
 */
export function parseProjectionsCSV(text) {
	const lines = text.trim().split('\n');
	if (lines.length < 2) return [];

	const headers = lines[0].split(',').map((h) => h.trim());
	const years = headers.slice(1).map((y) => parseInt(y, 10));

	// Build a map: year -> { sector: value }
	/** @type {Map<number, Record<string, number>>} */
	const yearData = new Map();

	// Initialize all years
	for (const year of years) {
		yearData.set(year, {});
	}

	// Parse each sector row
	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(',');
		if (values.length < 2) continue;

		const sectorName = values[0].trim();
		const internalKey = PROJECTIONS_CSV_MAP[sectorName];
		if (!internalKey) continue;

		for (let j = 1; j < values.length && j <= years.length; j++) {
			const year = years[j - 1];
			const valueInTonnes = parseNumber(values[j]);
			// Convert tonnes to MtCO2e
			const valueInMt = valueInTonnes / 1_000_000;

			const yearRecord = yearData.get(year);
			if (yearRecord) {
				yearRecord[internalKey] = valueInMt;
			}
		}
	}

	// Convert to array of data points
	const data = [];
	for (const [year, sectors] of yearData) {
		const date = yearToDate(year);
		const fy = calendarYearToFY(year);

		data.push({
			date,
			time: date.getTime(),
			fy,
			interval: /** @type {'annual'} */ ('annual'),
			dataType: getDataType(fy),
			...sectors,
			net_total: calculateNetTotal(sectors)
		});
	}

	// Sort by date
	return data.sort((a, b) => a.time - b.time);
}

/**
 * Aggregate quarterly data to yearly (by financial year)
 * @param {EmissionsDataPoint[]} quarterlyData
 * @returns {EmissionsDataPoint[]}
 */
export function aggregateToYearly(quarterlyData) {
	// Group by financial year
	/** @type {Map<number, EmissionsDataPoint[]>} */
	const fyGroups = new Map();

	for (const point of quarterlyData) {
		const existing = fyGroups.get(point.fy) || [];
		existing.push(point);
		fyGroups.set(point.fy, existing);
	}

	// Aggregate each FY
	const data = [];
	for (const [fy, points] of fyGroups) {
		if (points.length === 0) continue;

		// Sum all sectors (these are already quarterly totals, so sum them for annual)
		/** @type {Record<string, number>} */
		const sectors = {};

		for (const key of SECTOR_ORDER) {
			sectors[key] = points.reduce((sum, p) => sum + (/** @type {number} */ (p[key]) || 0), 0);
		}

		// Use the start of the FY as the date point
		const date = yearToDate(fy);

		data.push({
			date,
			time: date.getTime(),
			fy,
			interval: /** @type {'annual'} */ ('annual'),
			dataType: getDataType(fy),
			...sectors,
			net_total: calculateNetTotal(sectors)
		});
	}

	return data.sort((a, b) => a.time - b.time);
}

/**
 * Filter data by financial year range
 * @param {EmissionsDataPoint[]} data
 * @param {number} startFY
 * @param {number} endFY
 * @returns {EmissionsDataPoint[]}
 */
export function filterByFYRange(data, startFY, endFY) {
	return data.filter((d) => d.fy >= startFY && d.fy <= endFY);
}

/**
 * Merge multiple data arrays, preferring quarterly data over annual when both exist
 * @param {EmissionsDataPoint[][]} dataArrays
 * @returns {EmissionsDataPoint[]}
 */
export function mergeData(...dataArrays) {
	/** @type {Map<number, EmissionsDataPoint>} */
	const fyMap = new Map();

	for (const dataArray of dataArrays) {
		for (const point of dataArray) {
			const existing = fyMap.get(point.fy);
			// Prefer quarterly over annual if same FY
			if (!existing || (existing.interval === 'annual' && point.interval === 'quarterly')) {
				fyMap.set(point.fy, point);
			}
		}
	}

	return Array.from(fyMap.values()).sort((a, b) => a.time - b.time);
}
