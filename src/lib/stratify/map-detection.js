/**
 * Best-effort auto-detection of lat/lng/label columns when the user switches a
 * Stratify chart to the `map` type. Each detector returns the column `key` or
 * `null`. Header name + value-range checks are deliberately conservative — if
 * we're not sure, return null and let the user pick.
 */

/**
 * @typedef {import('./csv-parser.js').ColumnMeta} ColumnMeta
 */

const LAT_HEADER_RE = /^(lat|latitude|y)$/i;
const LNG_HEADER_RE = /^(lng|lon|long|longitude|x)$/i;

const SAMPLE_ROWS = 50;

/**
 * @param {ColumnMeta[]} allColumns
 * @param {Array<Record<string, any>>} data
 * @param {RegExp} headerRe
 * @param {number} min
 * @param {number} max
 * @returns {string | null}
 */
function detectGeoColumn(allColumns, data, headerRe, min, max) {
	const matches = allColumns.filter((c) => c.isNumeric && headerRe.test(c.label));
	for (const col of matches) {
		if (isInRange(data, col.key, min, max)) return col.key;
	}
	return null;
}

/**
 * @param {Array<Record<string, any>>} data
 * @param {string} key
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function isInRange(data, key, min, max) {
	const sample = data.slice(0, SAMPLE_ROWS);
	if (sample.length === 0) return true;
	let validCount = 0;
	for (const row of sample) {
		const v = Number(row[key]);
		if (Number.isFinite(v)) {
			if (v < min || v > max) return false;
			validCount++;
		}
	}
	return validCount > 0;
}

/**
 * @param {ColumnMeta[]} allColumns
 * @param {Array<Record<string, any>>} data
 * @returns {string | null}
 */
export function detectLatColumn(allColumns, data) {
	return detectGeoColumn(allColumns, data, LAT_HEADER_RE, -90, 90);
}

/**
 * @param {ColumnMeta[]} allColumns
 * @param {Array<Record<string, any>>} data
 * @returns {string | null}
 */
export function detectLngColumn(allColumns, data) {
	return detectGeoColumn(allColumns, data, LNG_HEADER_RE, -180, 180);
}

/**
 * Pick the first non-numeric column as the popup title. Useful default —
 * skipped if the user already chose one.
 * @param {ColumnMeta[]} allColumns
 * @returns {string | null}
 */
export function detectLabelColumn(allColumns) {
	const first = allColumns.find((c) => !c.isNumeric);
	return first?.key ?? null;
}
