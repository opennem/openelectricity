#!/usr/bin/env node
/**
 * Build solar heatmap data: solar share (%) per 30-minute block per day.
 *
 * Fetches NEM 5-minute power data from the API in 30-day batches,
 * computes solar as a % of total generation for each 30-min block,
 * and writes per-year JSON files.
 *
 * Usage:
 *   bun scripts/build-solar-heatmap.js
 *
 * Output:
 *   static/data/solar-heatmap/2010.json ... 2026.json
 *
 * Each JSON file:
 *   { year, max, data: [ [v0, v1, ..., v47], ... ] }
 *   - data[dayIndex][slotIndex] = solar share % (0-100, 1 decimal)
 *   - 48 slots per day (30-min blocks: 00:00, 00:30, 01:00, ...)
 *   - days ordered Jan 1 → Dec 31
 */

import { OpenElectricityClient } from 'openelectricity';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const API_URL = 'https://api.openelectricity.org.au/v4';
const API_KEY = 'oe_internal_122b0fd1af087f67c682d6a189e727b3';
const OUTPUT_DIR = 'static/data/solar-heatmap';

const BATCH_DAYS = 30;
const START_YEAR = 2010;
const DELAY_MS = 500;

// Columns that represent loads (not generation)
const LOAD_COLS = new Set(['pumps', 'battery_charging', 'battery']);

// Solar columns
const SOLAR_COLS = ['solar_utility', 'solar_rooftop'];

const client = new OpenElectricityClient({
	apiKey: API_KEY,
	baseUrl: API_URL
});

function formatDate(date) {
	return date.toISOString().slice(0, 19);
}

function addDays(date, days) {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract time-of-day slot index (0-47) from a date string.
 * Dates are in NEM local time with +10:00 offset.
 * @param {string} dateStr - e.g. "2025-01-15T14:35:00+10:00"
 * @returns {number} slot 0-47
 */
function getSlotIndex(dateStr) {
	const timePart = dateStr.slice(11, 16); // "HH:MM"
	const [h, m] = timePart.split(':').map(Number);
	return h * 2 + Math.floor(m / 30);
}

/**
 * Extract date key (YYYY-MM-DD) from a date string.
 * @param {string} dateStr
 * @returns {string}
 */
function getDateKey(dateStr) {
	return dateStr.slice(0, 10);
}

/**
 * Extract year from a date string.
 * @param {string} dateStr
 * @returns {number}
 */
function getYear(dateStr) {
	return parseInt(dateStr.slice(0, 4));
}

async function main() {
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const now = new Date();
	const nemNow = new Date(now.getTime() + 10 * 3600_000);
	const endDate = new Date(
		Date.UTC(nemNow.getUTCFullYear(), nemNow.getUTCMonth(), nemNow.getUTCDate())
	);
	const startDate = new Date(Date.UTC(START_YEAR, 0, 1));

	const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 3600_000));
	const totalBatches = Math.ceil(totalDays / BATCH_DAYS);

	console.log(
		`Building solar heatmap: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`
	);
	console.log(`~${totalBatches} batches, output: ${OUTPUT_DIR}/\n`);

	/**
	 * Accumulator per year → per day → per slot:
	 * { solarSum, totalSum, count }
	 * @type {Map<number, Map<string, Array<{solarSum: number, totalSum: number, count: number}>>>}
	 */
	const yearData = new Map();

	let batchNum = 0;
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

			// Map result index → fuel tech name
			const colNames = results.map(
				(r) => r.columns?.fueltech || r.columns?.fueltech_group || r.name || 'unknown'
			);

			// For each 5-min interval, compute solar and total generation
			// Build: dateStr → { solar, total } for each data point
			// First, get the union of all date strings
			/** @type {Map<string, {solar: number, total: number}>} */
			const intervalData = new Map();

			for (let i = 0; i < results.length; i++) {
				const colName = String(colNames[i]);
				const isSolar = SOLAR_COLS.includes(colName);
				const isLoad = LOAD_COLS.has(colName);

				for (const [dateStr, value] of results[i].data) {
					if (!intervalData.has(dateStr)) {
						intervalData.set(dateStr, { solar: 0, total: 0 });
					}
					const entry = intervalData.get(dateStr);
					const val = value ?? 0;

					if (isSolar) {
						entry.solar += Math.max(0, val);
						entry.total += Math.max(0, val);
					} else if (!isLoad) {
						entry.total += Math.max(0, val);
					}
				}
			}

			// Accumulate into 30-min slots per day per year
			for (const [dateStr, { solar, total }] of intervalData) {
				const year = getYear(dateStr);
				const dateKey = getDateKey(dateStr);
				const slot = getSlotIndex(dateStr);

				if (!yearData.has(year)) yearData.set(year, new Map());
				const days = yearData.get(year);

				if (!days.has(dateKey)) {
					// 48 slots, each with accumulator
					days.set(
						dateKey,
						Array.from({ length: 48 }, () => ({ solarSum: 0, totalSum: 0, count: 0 }))
					);
				}

				const slots = days.get(dateKey);
				slots[slot].solarSum += solar;
				slots[slot].totalSum += total;
				slots[slot].count += 1;
			}

			console.log(`${intervalData.size} intervals`);
		} catch (err) {
			console.log(`ERROR: ${err.message}`);
		}

		cursor = batchEnd;
		await sleep(DELAY_MS);
	}

	// Write per-year JSON files
	console.log('\nWriting JSON files...');

	for (const [year, days] of [...yearData.entries()].sort((a, b) => a[0] - b[0])) {
		// Sort days chronologically
		const sortedDays = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));

		let yearMax = 0;
		const data = sortedDays.map(([, slots]) => {
			return slots.map((s) => {
				if (s.count === 0 || s.totalSum === 0) return 0;
				const pct = Math.round((s.solarSum / s.totalSum) * 1000) / 10; // 1 decimal
				if (pct > yearMax) yearMax = pct;
				return pct;
			});
		});

		const output = {
			year,
			max: Math.round(yearMax * 10) / 10,
			days: sortedDays.map(([d]) => d),
			data
		};

		const outFile = `${OUTPUT_DIR}/${year}.json`;
		writeFileSync(outFile, JSON.stringify(output));
		console.log(`  ${year}.json: ${data.length} days, max ${yearMax.toFixed(1)}%`);
	}

	console.log('\nDone!');
}

main().catch(console.error);
