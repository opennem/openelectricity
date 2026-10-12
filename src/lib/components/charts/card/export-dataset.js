/**
 * Export datasets — the shape every chart card download takes
 * (`ExportDataset`: typed columns + wide rows) and its serialisers: CSV,
 * XLSX sheets and the "All charts" workbook, plus the card table view's cell
 * formatting. One shape, so the CSV, the workbook and the table view never
 * disagree about headers, units or row order. Pure module: no Svelte, no DOM.
 *
 * Timestamps are the network's local time: CSV writes them with the offset
 * ("2026-07-01 14:30:00+10:00"), XLSX writes a real date-time cell.
 */

import { escapeCsv } from '$lib/utils/download-csv.js';
import { excelDateSerial } from '$lib/utils/download-xlsx.js';
import { formatNetworkTimestamp } from '$lib/components/charts/v2/network-time.js';
import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';

/** @typedef {import('./types.js').ExportColumn} ExportColumn */
/** @typedef {import('./types.js').ExportDataset} ExportDataset */
/** @typedef {import('$lib/utils/download-xlsx.js').XlsxSheet} XlsxSheet */
/** @typedef {import('$lib/utils/download-xlsx.js').XlsxCell} XlsxCell */

/** Excel's sheet-name rules: at most 31 characters, none of []:*?/\ */
const SHEET_NAME_MAX = 31;
const SHEET_NAME_ILLEGAL = /[[\]:*?/\\]/g;
const XLSX_DATE_FORMAT = 'yyyy-mm-dd hh:mm';
export const SUMMARY_SHEET = 'Summary';

/** A row's time in epoch ms (`time`, else `date`), or null.
 * @param {Record<string, any>} row */
export function rowTime(row) {
	const ms = row.time ?? row.date?.getTime?.();
	return Number.isFinite(ms) ? /** @type {number} */ (ms) : null;
}

/**
 * Wide CSV: one header line, then one line per row. Non-finite numbers and
 * missing values become empty cells — never fabricated zeros.
 * @param {ExportDataset} dataset
 * @param {string} timeZone
 * @returns {string}
 */
export function datasetToCsv(dataset, timeZone) {
	const lines = [dataset.columns.map((column) => escapeCsv(column.header)).join(',')];
	for (const row of dataset.rows) {
		const cells = dataset.columns.map((column) => {
			const value = row[column.key];
			switch (column.type) {
				case 'time': {
					const ms = rowTime(row);
					return ms === null ? '' : formatNetworkTimestamp(ms, timeZone);
				}
				case 'number':
					return Number.isFinite(value) ? String(value) : '';
				case 'boolean':
					return value == null ? '' : String(Boolean(value));
				default:
					return escapeCsv(value);
			}
		});
		lines.push(cells.join(','));
	}
	return lines.join('\n');
}

/** Grouped number formats with a fixed number of decimal places, by places. */
const DISPLAY_NUMBER = [0, 1, 2].map(
	(digits) =>
		new Intl.NumberFormat('en-AU', {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		})
);

/** Decimal places for a value of this size: none from 1,000, one from 10, else two.
 * @param {number} size */
const placesFor = (size) => (size >= 1000 ? 0 : size >= 10 ? 1 : 2);

/**
 * Decimal places for each number column of a card's table view, sized to
 * the column's largest value, so a column's figures line up.
 * @param {ExportDataset} dataset
 * @returns {Record<string, number>}
 */
export function datasetColumnPlaces(dataset) {
	return Object.fromEntries(
		dataset.columns
			.filter((column) => column.type === 'number')
			.map((column) => {
				let max = 0;
				for (const row of dataset.rows) {
					const value = row[column.key];
					if (Number.isFinite(value)) max = Math.max(max, Math.abs(value));
				}
				return [column.key, placesFor(max)];
			})
	);
}

/**
 * A dataset cell as a card's table view shows it: date-times in the
 * network's wall time to the minute, numbers grouped to `places` decimal
 * places (by default sized to the value: see `datasetColumnPlaces`),
 * booleans as Yes/No and missing values blank. The CSV keeps full precision.
 * @param {ExportColumn} column
 * @param {Record<string, any>} row
 * @param {string} timeZone
 * @param {number} [places]
 * @returns {string}
 */
export function formatDatasetCell(column, row, timeZone, places) {
	const value = row[column.key];
	switch (column.type) {
		case 'time': {
			const ms = rowTime(row);
			return ms === null ? '' : formatNetworkTimestamp(ms, timeZone).slice(0, 16);
		}
		case 'number':
			if (!Number.isFinite(value)) return '';
			return DISPLAY_NUMBER[places ?? placesFor(Math.abs(value))].format(value);
		case 'boolean':
			return value == null ? '' : value ? 'Yes' : 'No';
		default:
			return value == null ? '' : String(value);
	}
}

/** @param {string} name */
export function sheetName(name) {
	return name.replace(SHEET_NAME_ILLEGAL, '').trim().slice(0, SHEET_NAME_MAX).trimEnd() || 'Sheet';
}

/**
 * One worksheet per dataset: bold, frozen header row; date-time cells in the
 * network's wall time; typed numbers so spreadsheets can chart them.
 * @param {ExportDataset} dataset
 * @param {string} timeZone
 * @returns {XlsxSheet}
 */
export function datasetToSheet(dataset, timeZone) {
	/** @type {Array<Array<XlsxCell | null>>} */
	const data = [
		dataset.columns.map((column) => ({ value: column.header, type: String, fontWeight: 'bold' }))
	];
	for (const row of dataset.rows) {
		data.push(
			dataset.columns.map((column) => {
				const value = row[column.key];
				switch (column.type) {
					case 'time': {
						const ms = rowTime(row);
						return ms === null
							? null
							: { value: excelDateSerial(ms, timeZone), type: Number, format: XLSX_DATE_FORMAT };
					}
					case 'number':
						return Number.isFinite(value) ? { value, type: Number } : null;
					case 'boolean':
						return value == null ? null : { value: Boolean(value), type: Boolean };
					default:
						return value == null || value === '' ? null : { value: String(value), type: String };
				}
			})
		);
	}
	return {
		sheet: sheetName(dataset.title),
		data,
		columns: dataset.columns.map((column, index) => ({ width: index === 0 ? 20 : 16 })),
		stickyRowsCount: 1
	};
}

/**
 * @param {Array<[string, string]>} rows
 * @returns {XlsxSheet}
 */
export function summaryToSheet(rows) {
	return {
		sheet: SUMMARY_SHEET,
		data: rows.map(([label, value]) => [
			{ value: label, type: String, fontWeight: 'bold' },
			{ value, type: String }
		]),
		columns: [{ width: 20 }, { width: 80 }]
	};
}

/**
 * Excel-safe, unique sheet names in order: illegal characters stripped,
 * at most 31 characters, and repeats (case-insensitive, as Excel compares
 * them) numbered " (2)", " (3)"… within the limit. `reserved` names are
 * taken already.
 * @param {string[]} names
 * @param {string[]} [reserved]
 * @returns {string[]}
 */
export function uniqueSheetNames(names, reserved = [SUMMARY_SHEET]) {
	const taken = new Set(reserved.map((name) => name.toLowerCase()));
	return names.map((name) => {
		const base = sheetName(name);
		let candidate = base;
		for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
			const suffix = ` (${n})`;
			candidate = `${base.slice(0, SHEET_NAME_MAX - suffix.length).trimEnd()}${suffix}`;
		}
		taken.add(candidate.toLowerCase());
		return candidate;
	});
}

/**
 * The "All charts" workbook: Summary first, then one sheet per dataset, named
 * by its title.
 * @param {{ summary: Array<[string, string]>, datasets: ExportDataset[], timeZone: string }} input
 * @returns {XlsxSheet[]}
 */
export function buildWorkbookSheets({ summary, datasets, timeZone }) {
	const names = uniqueSheetNames(datasets.map((item) => item.title));
	return [
		summaryToSheet(summary),
		...datasets.map((item, index) => ({
			...datasetToSheet(item, timeZone),
			sheet: names[index]
		}))
	];
}

/**
 * A value column's header, "Label (unit)" — unless the label already ends
 * with its unit ("Price ($/MWh)"). A qualifier ("Battery (Charging)") still
 * takes the unit.
 * @param {string} label @param {string} unit
 */
export function headerFor(label, unit) {
	return label.endsWith(`(${unit})`) ? label : `${label} (${unit})`;
}

/**
 * A chart's download as drawn: a time column, then a column per series not
 * hidden (in the chart's order, headed "Label (unit)"), over its observed
 * rows — never a synthetic calendar-band closing row. Null without data.
 * @param {{
 *   key: string,
 *   title: string,
 *   snapshot: import('./types.js').ChartSnapshot | null,
 *   unit: string,
 *   hidden?: string[]
 * }} input
 * @returns {ExportDataset | null}
 */
export function seriesDataset({ key, title, snapshot, unit, hidden = [] }) {
	if (!snapshot) return null;
	const rows = snapshot.data.filter(isObservationRow);
	/** @type {ExportColumn[]} */
	const columns = snapshot.seriesNames
		.filter((id) => !hidden.includes(id))
		.map((id) => {
			return {
				key: id,
				header: headerFor(snapshot.seriesLabels[id] ?? id, unit),
				type: 'number'
			};
		});
	if (!rows.length || !columns.length) return null;
	return {
		key,
		title,
		columns: [{ key: 'time', header: 'date', type: 'time' }, ...columns],
		rows
	};
}
