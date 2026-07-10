/**
 * CSV builders for the facility detail page's chart datasets. Each builder
 * takes the viewport-clipped, display-aggregated rows the page already holds
 * (they're exactly what the charts render — including sign-inverted load
 * series, and all units regardless of the panel's visibility toggles) and
 * returns a CSV string, or null when there's nothing to export.
 */

import { fuelTechNameMap } from '$lib/fuel_techs';
import { makeUnitLabelGetter } from '$lib/components/charts/facility/helpers.js';
import { offsetMsFromOffset } from '$lib/components/charts/v2/network-time.js';
import { downloadCsv } from '$lib/utils/download-csv';
import { escapeCsv } from '../../../facilities/_utils/facilities-csv.js';

/**
 * The context the chart CSV builders draw from — the viewport-clipped datasets
 * the page (or unit sheet) already holds, plus filename inputs.
 * @typedef {{
 *   intervalData?: { data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null,
 *   summaryData?: { mvData: any[], energyData: any[], mvSeriesNames: string[], energySeriesNames: string[] } | null,
 *   emissionsData?: { rows: any[], seriesNames: string[] } | null,
 *   facility: any,
 *   metric: string,
 *   timeZone: string,
 *   fileCode?: string,
 *   rangeSlug?: string
 * }} ChartCsvContext
 */

/**
 * The download catalogue offered in the chart options menus — single source
 * for the key/label pairs so every menu and dispatcher stays in lockstep.
 *
 * @param {{ showEmissions?: boolean }} [options] - emissions is offered only
 *   where an emissions provider feeds the data (the main page, not the unit sheet)
 * @returns {Array<{ key: string, label: string }>}
 */
export function chartDownloadItems({ showEmissions = false } = {}) {
	return [
		{ key: 'generation', label: 'Generation' },
		{ key: 'energy', label: 'Energy' },
		{ key: 'market-value', label: 'Market value' },
		...(showEmissions ? [{ key: 'emissions', label: 'Emissions' }] : [])
	];
}

/**
 * Build the CSV for a download-catalogue key. Null when that dataset hasn't
 * arrived yet.
 *
 * @param {string} key
 * @param {ChartCsvContext} ctx
 * @returns {string | null}
 */
export function buildChartCsv(key, ctx) {
	const {
		intervalData = null,
		summaryData = null,
		emissionsData = null,
		facility,
		metric,
		timeZone
	} = ctx;
	switch (key) {
		case 'generation':
			return generationCsv({ intervalData, metric, timeZone });
		case 'energy':
			return energyCsv({ summaryData, facility, timeZone });
		case 'market-value':
			return marketValueCsv({ summaryData, facility, timeZone });
		case 'emissions':
			return emissionsCsv({ emissionsData, facility, timeZone });
		default:
			return null;
	}
}

/**
 * Build and save the CSV for a download-catalogue key as
 * `{code}-{key}-{rangeSlug}.csv`. No-ops while the dataset is still loading.
 *
 * @param {string} key
 * @param {ChartCsvContext} ctx - `fileCode` overrides the filename's leading
 *   code (the unit sheet passes its unit code; defaults to the facility code)
 */
export function downloadChartCsv(key, ctx) {
	const csv = buildChartCsv(key, ctx);
	if (!csv) return;
	const code = (ctx.fileCode ?? ctx.facility?.code)?.toLowerCase() ?? 'facility';
	downloadCsv(csv, `${code}-${key}-${ctx.rangeSlug}.csv`);
}

/**
 * Format an instant in the network's local time, offset included:
 * "2026-07-01 14:30:00+10:00". Exact for both networks — NEM (+10:00) and
 * WEM (+08:00) are fixed-offset, no DST.
 *
 * @param {number} ms - epoch ms
 * @param {string} timeZone - network offset, e.g. '+10:00'
 * @returns {string}
 */
export function formatNetworkTimestamp(ms, timeZone) {
	const local = new Date(ms + offsetMsFromOffset(timeZone)).toISOString();
	return `${local.slice(0, 19).replace('T', ' ')}${timeZone}`;
}

/**
 * Shared core: one "date" column plus one column per series. Nulls and
 * non-finite values become empty cells — never fabricated zeros.
 *
 * @param {{
 *   rows: any[] | undefined,
 *   seriesNames: string[] | undefined,
 *   headerFor: (seriesName: string) => string,
 *   timeZone: string
 * }} config
 * @returns {string | null}
 */
function buildSeriesCsv({ rows, seriesNames, headerFor, timeZone }) {
	if (!rows?.length || !seriesNames?.length) return null;

	const header = ['date', ...seriesNames.map(headerFor)].map(escapeCsv).join(',');
	const lines = [header];

	for (const row of rows) {
		const ms = row.time ?? row.date?.getTime?.();
		if (!Number.isFinite(ms)) continue;
		const cells = [formatNetworkTimestamp(ms, timeZone)];
		for (const name of seriesNames) {
			const value = row[name];
			cells.push(Number.isFinite(value) ? String(value) : '');
		}
		lines.push(cells.join(','));
	}

	return lines.join('\n');
}

/**
 * Column-header builder for datasets whose payloads don't carry labels
 * (energy / market value / emissions): rebuilds the chart-legend label —
 * "DISPLAYCODE (Fuel Tech Name)" — from the facility's units, then appends
 * the unit of measure. Series ids are `<prefix><unitCode>`; unit codes can
 * contain underscores, so only the known prefix is stripped.
 *
 * @param {any} facility
 * @param {string} prefix - series id prefix, e.g. 'energy_'
 * @param {string} suffix - unit of measure, e.g. ' (MWh)'
 * @returns {(seriesName: string) => string}
 */
function makeSeriesHeaderFor(facility, prefix, suffix) {
	/** @type {Record<string, string>} */
	const unitCodeDisplayMap = {};
	/** @type {Record<string, string>} */
	const unitFuelTechMap = {};
	for (const unit of facility?.units ?? []) {
		if (unit.code_display) unitCodeDisplayMap[unit.code] = unit.code_display;
		unitFuelTechMap[unit.code] = unit.fueltech_id;
	}
	const getLabel = makeUnitLabelGetter(unitCodeDisplayMap, fuelTechNameMap);
	return (seriesName) => {
		const code = seriesName.startsWith(prefix) ? seriesName.slice(prefix.length) : seriesName;
		return `${getLabel(code, unitFuelTechMap[code] ?? 'unknown')}${suffix}`;
	};
}

/**
 * Generation chart rows (power or energy by unit, at the display interval).
 * Uses the labels the chart itself computed. `metric` is the range control's
 * active metric — 'energy' labels columns in MWh, anything else in MW.
 *
 * @param {{
 *   intervalData: { data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null,
 *   metric: string,
 *   timeZone: string
 * }} config
 * @returns {string | null}
 */
export function generationCsv({ intervalData, metric, timeZone }) {
	if (!intervalData) return null;
	const suffix = metric === 'energy' ? ' (MWh)' : ' (MW)';
	return buildSeriesCsv({
		rows: intervalData.data,
		seriesNames: intervalData.seriesNames,
		headerFor: (name) => `${intervalData.seriesLabels?.[name] ?? name}${suffix}`,
		timeZone
	});
}

/**
 * @param {{ summaryData: { energyData: any[], energySeriesNames: string[] } | null, facility: any, timeZone: string }} config
 * @returns {string | null}
 */
export function energyCsv({ summaryData, facility, timeZone }) {
	if (!summaryData) return null;
	return buildSeriesCsv({
		rows: summaryData.energyData,
		seriesNames: summaryData.energySeriesNames,
		headerFor: makeSeriesHeaderFor(facility, 'energy_', ' (MWh)'),
		timeZone
	});
}

/**
 * @param {{ summaryData: { mvData: any[], mvSeriesNames: string[] } | null, facility: any, timeZone: string }} config
 * @returns {string | null}
 */
export function marketValueCsv({ summaryData, facility, timeZone }) {
	if (!summaryData) return null;
	return buildSeriesCsv({
		rows: summaryData.mvData,
		seriesNames: summaryData.mvSeriesNames,
		headerFor: makeSeriesHeaderFor(facility, 'market_value_', ' ($)'),
		timeZone
	});
}

/**
 * @param {{ emissionsData: { rows: any[], seriesNames: string[] } | null, facility: any, timeZone: string }} config
 * @returns {string | null}
 */
export function emissionsCsv({ emissionsData, facility, timeZone }) {
	if (!emissionsData) return null;
	return buildSeriesCsv({
		rows: emissionsData.rows,
		seriesNames: emissionsData.seriesNames,
		headerFor: makeSeriesHeaderFor(facility, 'emissions_', ' (tCO₂e)'),
		timeZone
	});
}
