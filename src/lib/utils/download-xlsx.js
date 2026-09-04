/**
 * XLSX download helper. `write-excel-file` is loaded on demand so the
 * spreadsheet writer (and its zip dependency) stays off every page's initial
 * bundle — only a download click pays for it.
 */

import { offsetMsFromOffset } from '$lib/components/charts/v2/network-time.js';
import { downloadBlob } from './download-csv.js';

/**
 * A single cell. `type` mirrors write-excel-file's constructor convention
 * (`String`, `Number`, `Boolean`, `Date`); omit it to let the library infer.
 * @typedef {{
 *   value?: string | number | boolean | Date | null,
 *   type?: StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor,
 *   format?: string,
 *   fontWeight?: 'bold',
 *   wrap?: boolean
 * }} XlsxCell
 */

/**
 * One worksheet: a name, rows of cells, optional column widths (in
 * characters) and a frozen header row count.
 * @typedef {{
 *   sheet: string,
 *   data: Array<Array<XlsxCell | null>>,
 *   columns?: Array<{ width?: number }>,
 *   stickyRowsCount?: number
 * }} XlsxSheet
 */

const EXCEL_EPOCH_OFFSET_DAYS = 25_569; // 1970-01-01 as an Excel serial day
const DAY_MS = 86_400_000;

/**
 * An instant as an Excel date serial in the network's local wall time.
 * Excel dates carry no timezone, so the caller states the zone elsewhere
 * (the tracker workbook does this on its Summary sheet).
 *
 * @param {number} ms - epoch ms
 * @param {string} timeZone - network offset, e.g. '+10:00'
 * @returns {number}
 */
export function excelDateSerial(ms, timeZone) {
	return EXCEL_EPOCH_OFFSET_DAYS + (ms + offsetMsFromOffset(timeZone)) / DAY_MS;
}

/**
 * Build a workbook from the given sheets and save it as `fileName`.
 *
 * @param {XlsxSheet[]} sheets
 * @param {string} fileName - e.g. 'tracker.xlsx'
 */
export async function downloadXlsx(sheets, fileName) {
	const { default: writeExcelFile } = await import('write-excel-file/universal');
	const blob = await writeExcelFile(/** @type {any} */ (sheets)).toBlob();
	downloadBlob(blob, fileName);
}
