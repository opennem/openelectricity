import quarterMeta from './data/quarter-meta.json';
import quarterCsv from './data/quarter.csv?raw';
import yearMeta from './data/year-meta.json';
import yearCsv from './data/year.csv?raw';

/**
 * Descriptor bundled alongside each emissions CSV. Spread verbatim into the
 * endpoint response, so callers (opennem-fe) can read `source` and, for the
 * yearly dataset, `projectionStartYear`.
 *
 * @typedef {Object} EmissionsMeta
 * @property {string} id
 * @property {string} path - upstream provenance path; not used at runtime
 * @property {string} prefix
 * @property {{ label: string, url: string }} source
 * @property {number} [projectionStartYear]
 */

/**
 * Parse a simple CSV into header-keyed row objects, values left as strings
 * (callers `parseFloat` them). These datasets have no quoted fields or embedded
 * commas, so a split suffices — and, unlike d3-dsv's `csvParse`, it avoids
 * `new Function`, which the Cloudflare Workers runtime forbids.
 *
 * @param {string} csv
 * @returns {Record<string, string>[]}
 */
function parseCsv(csv) {
	const rows = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
	const columns = rows[0].split(',');
	return rows.slice(1).map((line) => {
		const cells = line.split(',');
		/** @type {Record<string, string>} */
		const row = {};
		columns.forEach((name, i) => {
			row[name] = cells[i];
		});
		return row;
	});
}

/**
 * The datasets are a static build-time snapshot, so each CSV is parsed once at
 * module load and the parsed rows are reused across requests.
 *
 * @type {Record<string, { meta: EmissionsMeta, data: Record<string, string>[] }>}
 */
const DATASETS = {
	quarter: { meta: quarterMeta, data: parseCsv(quarterCsv) },
	year: { meta: yearMeta, data: parseCsv(yearCsv) }
};

/** Periods with a bundled dataset — `['quarter', 'year']`. */
export const EMISSIONS_PERIODS = Object.keys(DATASETS);

/**
 * Build the emissions payload for a period: the dataset's metadata spread over a
 * `data` array of header-keyed CSV rows. Values are left as strings (callers
 * `parseFloat` them). Mirrors the legacy opennem-edge-data response contract.
 *
 * @param {string} period - e.g. `'quarter'` or `'year'`
 * @returns {(EmissionsMeta & { data: Record<string, string>[] }) | null} payload, or `null` for an unknown period
 */
export function getEmissions(period) {
	const dataset = DATASETS[period];
	if (!dataset) return null;
	return { ...dataset.meta, data: dataset.data };
}
