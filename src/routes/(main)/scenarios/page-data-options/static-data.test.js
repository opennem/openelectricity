import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { startOfYear, addYears } from 'date-fns';

const STATIC_DIR = resolve(process.cwd(), 'static/data/scenarios');

/** @type {Record<string, string>} */
const modelDirs = {
	'2018 ISP': '2018_ISP',
	'2020 ISP Draft': '2020_ISP_draft',
	'2020 ISP Final': '2020_ISP_final',
	'2022 ISP Draft': '2022_ISP_draft',
	'2022 ISP Final': '2022_ISP_final',
	'2024 ISP Draft': '2024_ISP_draft',
	'2024 ISP Final': '2024_ISP_final',
	'2026 ISP Draft': '2026_ISP_draft'
};

/**
 * Simulate the processing pipeline: strip timezone, parse date, startOfYear + addYears(1)
 * @param {string} dateStr
 * @returns {Date}
 */
function toEffectiveFY(dateStr) {
	// Strip timezone suffix (mimics useDate / stripDateTimezone)
	const naive = dateStr.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '');
	const date = new Date(naive);
	return startOfYear(addYears(date, 1));
}

describe.each(Object.entries(modelDirs))('%s static data', (label, dir) => {
	const dirPath = resolve(STATIC_DIR, dir);
	const files = readdirSync(dirPath).filter((f) => f.endsWith('.json'));

	it.each(files)('%s — data length matches year range', (file) => {
		const json = JSON.parse(readFileSync(resolve(dirPath, file), 'utf-8'));

		for (const record of json.data) {
			const { start, last, interval, data } = record.projection;
			expect(interval).toBe('1Y');

			const startYear = new Date(start).getFullYear();
			const lastYear = new Date(last).getFullYear();
			const expectedLength = lastYear - startYear + 1;

			expect(data).toHaveLength(expectedLength);
		}
	});

	it.each(files)('%s — all records share the same projection start and last', (file) => {
		const json = JSON.parse(readFileSync(resolve(dirPath, file), 'utf-8'));
		const starts = new Set(json.data.map((/** @type {any} */ r) => r.projection.start));
		const lasts = new Set(json.data.map((/** @type {any} */ r) => r.projection.last));

		expect(starts.size).toBe(1);
		expect(lasts.size).toBe(1);
	});

	it.each(files)('%s — effective FY range after processing pipeline', (file) => {
		const json = JSON.parse(readFileSync(resolve(dirPath, file), 'utf-8'));
		const firstRecord = json.data[0];
		const { start, last } = firstRecord.projection;

		const firstFY = toEffectiveFY(start);
		const lastFY = toEffectiveFY(last);

		// Sanity check: effective FY should be a valid year
		expect(firstFY.getFullYear()).toBeGreaterThanOrEqual(2018);
		expect(lastFY.getFullYear()).toBeLessThanOrEqual(2060);

		// Log for visibility
		console.log(
			`  ${label} / ${file}: raw=${start} → FY${firstFY.getFullYear()}–FY${lastFY.getFullYear()}`
		);
	});
});
