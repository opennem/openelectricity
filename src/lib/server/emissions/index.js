import { csvParse } from 'd3-dsv';

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
 * The datasets are a static build-time snapshot, so each CSV is parsed once at
 * module load and the parsed rows are reused across requests.
 *
 * @type {Record<string, { meta: EmissionsMeta, data: import('d3-dsv').DSVRowString<string>[] }>}
 */
const DATASETS = {
	quarter: { meta: quarterMeta, data: csvParse(quarterCsv) },
	year: { meta: yearMeta, data: csvParse(yearCsv) }
};

/** Periods with a bundled dataset — `['quarter', 'year']`. */
export const EMISSIONS_PERIODS = Object.keys(DATASETS);

/**
 * Build the emissions payload for a period: the dataset's metadata spread over a
 * `data` array of header-keyed CSV rows. Values are left as strings (callers
 * `parseFloat` them). Mirrors the legacy opennem-edge-data response contract.
 *
 * @param {string} period - e.g. `'quarter'` or `'year'`
 * @returns {(EmissionsMeta & { data: import('d3-dsv').DSVRowString<string>[] }) | null} payload, or `null` for an unknown period
 */
export function getEmissions(period) {
	const dataset = DATASETS[period];
	if (!dataset) return null;
	return { ...dataset.meta, data: dataset.data };
}
