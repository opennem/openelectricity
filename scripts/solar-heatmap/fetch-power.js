#!/usr/bin/env node
/**
 * Fetch NEM 5-minute power generation data from 2010 to present.
 *
 * The OE API limits 5-minute power queries to ~30 days per request,
 * so we fetch in 30-day batches and write per-year CSV files.
 *
 * Usage:
 *   bun scripts/fetch-nem-power.js
 *
 * Output:
 *   static/data/ignore/2010.csv
 *   static/data/ignore/2011.csv
 *   ...
 */

import { OpenElectricityClient } from 'openelectricity';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';

const API_URL = 'https://api.openelectricity.org.au/v4';
const API_KEY = 'oe_internal_122b0fd1af087f67c682d6a189e727b3';
const OUTPUT_DIR = 'static/data/ignore';

// NEM timezone offset: +10:00 (AEST, no DST)
const BATCH_DAYS = 30;
const START_YEAR = 2010;
const DELAY_MS = 500; // delay between requests to be polite

const client = new OpenElectricityClient({
	apiKey: API_KEY,
	baseUrl: API_URL
});

/**
 * Format a Date as timezone-naive string for the API (network local time).
 * NEM is UTC+10, but the API expects dates in NEM time without offset.
 * @param {Date} date - Date in NEM local time (constructed without offset)
 * @returns {string}
 */
function formatDate(date) {
	return date.toISOString().slice(0, 19);
}

/**
 * Add days to a date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

/**
 * Sleep for ms
 * @param {number} ms
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	// Ensure output directory exists
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Build date range: Jan 1 2010 → today (NEM local time)
	const now = new Date();
	// NEM local "today" = UTC + 10 hours
	const nemNow = new Date(now.getTime() + 10 * 3600_000);
	const endDate = new Date(
		Date.UTC(nemNow.getUTCFullYear(), nemNow.getUTCMonth(), nemNow.getUTCDate())
	);

	const startDate = new Date(Date.UTC(START_YEAR, 0, 1)); // Jan 1, 2010

	// Calculate total batches for progress
	const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 3600_000));
	const totalBatches = Math.ceil(totalDays / BATCH_DAYS);

	console.log(
		`Fetching NEM 5m power: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`
	);
	console.log(`Total: ~${totalDays} days in ~${totalBatches} batches of ${BATCH_DAYS} days`);
	console.log(`Output: ${OUTPUT_DIR}/<year>.csv\n`);

	// Fetch a recent batch first to capture the full set of fuel tech columns
	// (older years have fewer columns; using the superset ensures all data is captured)
	console.log('Detecting columns from recent data...');
	const { response: recentRes } = await client.getNetworkData('NEM', ['power'], {
		interval: '5m',
		dateStart: formatDate(addDays(endDate, -2)),
		dateEnd: formatDate(endDate),
		secondaryGrouping: ['fueltech']
	});
	const recentResults = recentRes?.data?.[0]?.results;
	/** @type {string[]} */
	let headerColumns = recentResults
		? recentResults.map(
				(r) =>
					String(
						r.columns?.fueltech ||
							r.columns?.fueltech_group ||
							r.columns?.fuel_tech ||
							r.name ||
							'unknown'
					)
			)
		: [];
	console.log(`Columns (${headerColumns.length}): ${headerColumns.join(', ')}\n`);

	let totalRows = 0;
	let batchNum = 0;

	/** Track which year files have had headers written */
	/** @type {Set<string>} */
	const yearHeadersWritten = new Set();

	let cursor = startDate;

	while (cursor < endDate) {
		batchNum++;
		const batchEnd = new Date(
			Math.min(addDays(cursor, BATCH_DAYS).getTime(), endDate.getTime())
		);

		const dateStart = formatDate(cursor);
		const dateEnd = formatDate(batchEnd);

		const pct = ((batchNum / totalBatches) * 100).toFixed(1);
		process.stdout.write(
			`[${batchNum}/${totalBatches}] ${pct}% | ${dateStart.slice(0, 10)} → ${dateEnd.slice(0, 10)} ... `
		);

		try {
			const { response } = await client.getNetworkData('NEM', ['power'], {
				interval: '5m',
				dateStart,
				dateEnd,
				secondaryGrouping: ['fueltech']
			});

			const results = response?.data?.[0]?.results;
			if (!results || results.length === 0) {
				console.log('no data');
				cursor = batchEnd;
				await sleep(DELAY_MS);
				continue;
			}

			// Build column name map: result index → fuel_tech name
			/** @type {string[]} */
			const colNames = results.map((r) => {
				const ft =
					r.columns?.fueltech ||
					r.columns?.fueltech_group ||
					r.columns?.fuel_tech ||
					r.name ||
					'unknown';
				return String(ft);
			});

			// Merge any new columns into the header (shouldn't happen with pre-detected header)
			if (headerColumns.length === 0) {
				headerColumns = colNames;
			}

			// Build a map: date → { fuelTech: value }
			/** @type {Map<string, Record<string, number|null>>} */
			const dateMap = new Map();

			for (let i = 0; i < results.length; i++) {
				const colName = colNames[i];
				for (const [dateStr, value] of results[i].data) {
					if (!dateMap.has(dateStr)) {
						dateMap.set(dateStr, {});
					}
					const row = dateMap.get(dateStr);
					if (row) row[colName] = value;
				}
			}

			// Sort by date and bucket rows by year
			const sortedDates = [...dateMap.keys()].sort();

			/** @type {Map<string, string>} year → csv chunk */
			const yearChunks = new Map();

			for (const dateStr of sortedDates) {
				const row = dateMap.get(dateStr);
				if (!row) continue;

				const year = dateStr.slice(0, 4);

				const values = (headerColumns || colNames).map((col) => {
					const val = row[col];
					return val === null || val === undefined ? '' : String(val);
				});

				const line = dateStr + ',' + values.join(',') + '\n';

				if (!yearChunks.has(year)) yearChunks.set(year, '');
				yearChunks.set(year, yearChunks.get(year) + line);
				totalRows++;
			}

			// Write each year's chunk to its file
			const header = ['date', ...headerColumns].join(',') + '\n';
			for (const [year, chunk] of yearChunks) {
				const yearFile = `${OUTPUT_DIR}/${year}.csv`;

				if (!yearHeadersWritten.has(year)) {
					writeFileSync(yearFile, header + chunk);
					yearHeadersWritten.add(year);
				} else {
					appendFileSync(yearFile, chunk);
				}
			}

			console.log(`${sortedDates.length} rows (total: ${totalRows})`);
		} catch (err) {
			console.log(`ERROR: ${err.message}`);
		}

		cursor = batchEnd;
		await sleep(DELAY_MS);
	}

	console.log(`\nDone! ${totalRows} rows across ${yearHeadersWritten.size} year files.`);
}

main().catch(console.error);
