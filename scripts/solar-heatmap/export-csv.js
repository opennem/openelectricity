/**
 * Export solar heatmap JSON files to CSV format.
 * Usage: node scripts/export-solar-csv.js
 *
 * Outputs CSV files to static/data/solar-heatmap/ alongside the JSON files.
 * Each CSV has columns: date, 00:00, 00:30, 01:00, ..., 23:30
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'static/data/solar-heatmap';

// Build header: date + 48 half-hour time slots
const timeSlots = Array.from({ length: 48 }, (_, i) => {
	const h = String(Math.floor(i / 2)).padStart(2, '0');
	const m = (i % 2) * 30 === 0 ? '00' : '30';
	return `${h}:${m}`;
});
const header = ['date', ...timeSlots].join(',');

const jsonFiles = readdirSync(dir).filter((f) => f.endsWith('.json'));

for (const file of jsonFiles) {
	const filePath = join(dir, file);
	const json = JSON.parse(readFileSync(filePath, 'utf-8'));

	if (!json.days || !json.data) continue;

	const rows = json.days.map((day, i) => {
		return [day, ...json.data[i]].join(',');
	});

	const csv = [header, ...rows].join('\n');
	const csvPath = filePath.replace('.json', '.csv');
	writeFileSync(csvPath, csv);
	console.log(`Wrote ${csvPath} (${json.days.length} rows)`);
}
