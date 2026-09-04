/**
 * Data export for the tracker page — the download catalogue behind the
 * options menu's "Download as CSV" rows and the single XLSX workbook.
 *
 * Every export starts from the same `ExportDataset` shape (typed columns +
 * wide rows) built from the canvas's export context, so the CSV and XLSX
 * serialisers never disagree about headers, units or row order. Pure module:
 * no Svelte, no DOM — the page does the downloading.
 *
 * Conventions:
 * - Values are in base units (MW/MWh, $, $/MWh, tCO2e, kgCO2e/MWh) regardless
 *   of the chart's display prefix; the unit is in the column header.
 * - Every series is exported regardless of the chart's hide toggles — a data
 *   export shouldn't depend on what happens to be visible. The one exception
 *   is inherited: the emissions chart's intensity processor already excludes
 *   hidden groups, so intensity rows reflect that (noted on the Summary).
 * - Timestamps are the network's local time. CSV writes them with the offset
 *   ("2026-07-01 14:30:00+10:00"); XLSX writes a real date-time cell and the
 *   Summary sheet states the zone.
 */

import { escapeCsv } from '$lib/utils/download-csv.js';
import { excelDateSerial } from '$lib/utils/download-xlsx.js';
import { formatNetworkTimestamp } from '$lib/components/charts/v2/network-time.js';
import {
	deriveVwPriceDisplayRows,
	VW_PRICE_SERIES_ID
} from '$lib/components/charts/network/process-price-vw.js';
import {
	deriveIntensityDisplayRows,
	INTENSITY_SERIES_ID
} from '$lib/components/charts/network/process-emissions-intensity.js';

/** @typedef {import('./types.js').ExportDatasetKey} ExportDatasetKey */
/** @typedef {import('./types.js').ExportColumn} ExportColumn */
/** @typedef {import('./types.js').ExportDataset} ExportDataset */
/** @typedef {import('./types.js').SeriesSnapshot} SeriesSnapshot */
/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */
/** @typedef {import('$lib/utils/download-xlsx.js').XlsxSheet} XlsxSheet */
/** @typedef {import('$lib/utils/download-xlsx.js').XlsxCell} XlsxCell */

const TIME_COLUMN = /** @type {const} */ ({ key: 'time', header: 'date', type: 'time' });
const MARKET_VALUE_ID = 'market_value';
const EMISSIONS_ID = 'emissions';
const ENERGY_ID = 'energy_mwh';

/** Excel's sheet-name rules: at most 31 characters, none of []:*?/\ */
const SHEET_NAME_MAX = 31;
const SHEET_NAME_ILLEGAL = /[[\]:*?/\\]/g;
const XLSX_DATE_FORMAT = 'yyyy-mm-dd hh:mm';

// ============================================
// Catalogue
// ============================================

/**
 * The rows offered under "Download as CSV". The fuel-tech table only exports
 * while its panel is open — its price/emissions/demand providers don't fetch
 * otherwise, so the columns would be empty.
 *
 * @param {{ tablePanelOpen: boolean }} options
 * @returns {Array<{ key: ExportDatasetKey, label: string }>}
 */
export function trackerDownloadItems({ tablePanelOpen }) {
	return [
		{ key: 'generation', label: 'Generation' },
		{ key: 'market', label: 'Market' },
		{ key: 'emissions', label: 'Emissions' },
		...(tablePanelOpen ? [{ key: /** @type {const} */ ('table'), label: 'Fuel tech table' }] : [])
	];
}

// ============================================
// Labels
// ============================================

/**
 * "Label (unit)" — unless the label already carries a parenthesised unit,
 * as the spot-price series does ("Price ($/MWh)").
 * @param {string} label
 * @param {string} unit
 */
export function headerFor(label, unit) {
	return /\([^()]*\)\s*$/.test(label) ? label : `${label} (${unit})`;
}

/** @param {TrackerExportContext['basis']} basis */
function generationUnit(basis) {
	return basis === 'energy' ? 'MWh' : 'MW';
}

/** @param {TrackerExportContext['priceMetric']} metric */
function marketModeLabel(metric) {
	if (metric === 'market_value') return 'Market value ($)';
	if (metric === 'price_vw') return 'Volume-weighted price ($/MWh)';
	return 'Spot price ($/MWh)';
}

/** @param {TrackerExportContext['emissionsMetric']} metric */
function emissionsModeLabel(metric) {
	return metric === 'emissions_intensity' ? 'Intensity (kgCO2e/MWh)' : 'Volume (tCO2e)';
}

/** @param {string} timeZone */
function timeZoneLabel(timeZone) {
	return `${timeZone === '+08:00' ? 'AWST' : 'AEST'} (UTC${timeZone})`;
}

// ============================================
// Datasets
// ============================================

/**
 * One column per series, headed with the chart's own label plus the unit.
 * @param {SeriesSnapshot} snapshot
 * @param {string} unit
 * @returns {ExportColumn[]}
 */
function seriesColumns(snapshot, unit) {
	return snapshot.seriesNames.map((name) => ({
		key: name,
		header: headerFor(snapshot.seriesLabels?.[name] ?? name, unit),
		type: 'number'
	}));
}

/**
 * @param {ExportDatasetKey} key
 * @param {string} title
 * @param {ExportColumn[]} columns
 * @param {Array<Record<string, any>>} rows
 * @returns {ExportDataset | null}
 */
function dataset(key, title, columns, rows) {
	if (!rows.length || !columns.length) return null;
	return { key, title, columns: [TIME_COLUMN, ...columns], rows };
}

/** @param {TrackerExportContext} ctx */
function generationDataset(ctx) {
	if (!ctx.generation) return null;
	return dataset(
		'generation',
		'Generation',
		seriesColumns(ctx.generation, generationUnit(ctx.basis)),
		ctx.generation.data
	);
}

/**
 * Market value and spot price export as they arrive. The volume-weighted
 * price chart holds only the components (market value + energy) and derives
 * the line at display time — the export does the same, and keeps the
 * components so the ratio is reproducible.
 * @param {TrackerExportContext} ctx
 */
function marketDataset(ctx) {
	if (!ctx.price) return null;
	if (ctx.priceMetric === 'price_vw') {
		const derived = deriveVwPriceDisplayRows(/** @type {any} */ (ctx.price.data));
		const rows = ctx.price.data.map((row, index) => ({
			...row,
			[VW_PRICE_SERIES_ID]: derived[index][VW_PRICE_SERIES_ID]
		}));
		return dataset(
			'market',
			'Market',
			[
				{ key: VW_PRICE_SERIES_ID, header: 'Volume-weighted price ($/MWh)', type: 'number' },
				{ key: MARKET_VALUE_ID, header: 'Market value ($)', type: 'number' },
				{ key: ENERGY_ID, header: 'Energy (MWh)', type: 'number' }
			],
			rows
		);
	}
	const unit = ctx.priceMetric === 'market_value' ? '$' : '$/MWh';
	return dataset('market', 'Market', seriesColumns(ctx.price, unit), ctx.price.data);
}

/**
 * Emissions volume exports as it arrives; intensity is derived from the
 * emissions + energy components exactly as the chart draws it.
 * @param {TrackerExportContext} ctx
 */
function emissionsDataset(ctx) {
	if (!ctx.emissions) return null;
	if (ctx.emissionsMetric === 'emissions_intensity') {
		const derived = deriveIntensityDisplayRows(/** @type {any} */ (ctx.emissions.data));
		const rows = ctx.emissions.data.map((row, index) => ({
			...row,
			[INTENSITY_SERIES_ID]: derived[index][INTENSITY_SERIES_ID]
		}));
		return dataset(
			'emissions',
			'Emissions',
			[
				{ key: INTENSITY_SERIES_ID, header: 'Emissions intensity (kgCO2e/MWh)', type: 'number' },
				{ key: EMISSIONS_ID, header: 'Emissions (tCO2e)', type: 'number' },
				{ key: ENERGY_ID, header: 'Energy (MWh)', type: 'number' }
			],
			rows
		);
	}
	return dataset(
		'emissions',
		'Emissions',
		seriesColumns(ctx.emissions, 'tCO2e'),
		ctx.emissions.data
	);
}

/**
 * The fuel-tech table as displayed: sources, loads, the curtailment section
 * and the Demand / Renewables summary rows, with a `Type` column standing in
 * for the table's headings. Values are the raw window statistics behind the
 * formatted cells.
 * @param {TrackerExportContext} ctx
 * @returns {ExportDataset | null}
 */
function tableDataset(ctx) {
	if (!ctx.tablePanelOpen || !ctx.tableRows?.length) return null;
	const contributionHeader = `Contribution (% ${ctx.contributionMode})`;
	/** @type {ExportColumn[]} */
	const columns = [
		{ key: 'label', header: 'Technology', type: 'string' },
		{ key: 'type', header: 'Type', type: 'string' },
		{ key: 'energyMWh', header: 'Energy (MWh)', type: 'number' },
		{ key: 'avPowerMW', header: 'Av power (MW)', type: 'number' },
		{ key: 'contributionPct', header: contributionHeader, type: 'number' },
		{ key: 'vwPrice', header: 'Av price ($/MWh)', type: 'number' },
		{ key: 'emissionsT', header: 'Emissions (tCO2e)', type: 'number' },
		{ key: 'intensityKgPerMWh', header: 'Intensity (kgCO2e/MWh)', type: 'number' },
		{ key: 'hidden', header: 'Hidden', type: 'boolean' },
		{ key: 'fuelTechs', header: 'Fuel techs', type: 'string' }
	];
	const fuelTechRows = ctx.tableRows.map((row) => ({
		label: row.label,
		type: row.isLoad ? 'load' : 'source',
		energyMWh: row.energyMWh,
		avPowerMW: row.avPowerMW,
		contributionPct: row.contributionPct,
		vwPrice: row.vwPrice,
		emissionsT: row.emissionsT,
		intensityKgPerMWh: row.intensityKgPerMWh,
		hidden: row.hidden,
		fuelTechs: row.fuelTechs.join(' ')
	}));
	/** @type {Array<Record<string, any>>} */
	const rows = [
		...fuelTechRows.filter((row) => row.type === 'source'),
		...fuelTechRows.filter((row) => row.type === 'load'),
		...ctx.curtailmentRows.map((row) => ({
			label: row.label,
			type: 'curtailment',
			energyMWh: row.energyMWh,
			avPowerMW: row.avPowerMW,
			contributionPct: row.contributionPct
		}))
	];
	if (ctx.overlaySummary) {
		rows.push(
			{
				label: 'Demand',
				type: 'summary',
				energyMWh: ctx.overlaySummary.demandEnergyMWh,
				avPowerMW: ctx.overlaySummary.demandAvMW
			},
			{
				label: 'Renewables',
				type: 'summary',
				energyMWh: ctx.overlaySummary.renewablesEnergyMWh,
				avPowerMW: ctx.overlaySummary.renewablesAvMW,
				contributionPct: ctx.overlaySummary.renewablesSharePct
			}
		);
	}
	return { key: 'table', title: 'Fuel tech table', columns, rows };
}

/**
 * Build one export dataset, or null while its data hasn't arrived.
 * @param {ExportDatasetKey} key
 * @param {TrackerExportContext} ctx
 * @returns {ExportDataset | null}
 */
export function buildExportDataset(key, ctx) {
	switch (key) {
		case 'generation':
			return generationDataset(ctx);
		case 'market':
			return marketDataset(ctx);
		case 'emissions':
			return emissionsDataset(ctx);
		case 'table':
			return tableDataset(ctx);
		default:
			return null;
	}
}

/**
 * Every available dataset, in menu order.
 * @param {TrackerExportContext} ctx
 * @returns {ExportDataset[]}
 */
export function buildExportDatasets(ctx) {
	return trackerDownloadItems({ tablePanelOpen: ctx.tablePanelOpen })
		.map((item) => buildExportDataset(item.key, ctx))
		.filter((item) => item !== null);
}

// ============================================
// Summary
// ============================================

/**
 * The workbook's Summary sheet: what was exported, from where, and the
 * caveats a reader needs (timezone, hidden groups).
 * @param {TrackerExportContext} ctx
 * @returns {Array<[string, string]>}
 */
export function summaryRows(ctx) {
	/** @type {Array<[string, string]>} */
	const rows = [
		['Region', ctx.regionLabel],
		['Range', ctx.rangeLabel],
		['Interval', ctx.intervalLabel],
		['Window start', formatNetworkTimestamp(ctx.window.start, ctx.timeZone)],
		['Window end', formatNetworkTimestamp(ctx.window.end, ctx.timeZone)],
		['Timezone', `${timeZoneLabel(ctx.timeZone)} — all timestamps are network-local`],
		['Fuel tech grouping', ctx.groupLabel],
		['Contribution basis', `% ${ctx.contributionMode}`],
		['Generation', ctx.basis === 'energy' ? 'Energy (MWh)' : 'Power (MW)'],
		['Market', marketModeLabel(ctx.priceMetric)],
		['Emissions', emissionsModeLabel(ctx.emissionsMetric)]
	];
	if (ctx.hiddenSeries.length) {
		const labels = ctx.hiddenSeries.map((id) => ctx.generation?.seriesLabels?.[id] ?? id);
		rows.push([
			'Hidden groups',
			`${labels.join(', ')} — exported in every dataset, but excluded from the intensity line`
		]);
	}
	rows.push(
		['Generated', formatNetworkTimestamp(ctx.generatedAtMs, ctx.timeZone)],
		['Source', ctx.sourceUrl]
	);
	return rows;
}

// ============================================
// Serialisers
// ============================================

/** @param {Record<string, any>} row */
function rowTime(row) {
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

/** @param {string} name */
export function sheetName(name) {
	return name.replace(SHEET_NAME_ILLEGAL, '').trim().slice(0, SHEET_NAME_MAX) || 'Sheet';
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
		sheet: 'Summary',
		data: rows.map(([label, value]) => [
			{ value: label, type: String, fontWeight: 'bold' },
			{ value, type: String }
		]),
		columns: [{ width: 20 }, { width: 80 }]
	};
}

/**
 * The workbook: Summary first, then every available dataset.
 * @param {TrackerExportContext} ctx
 * @returns {XlsxSheet[]}
 */
export function buildWorkbookSheets(ctx) {
	return [
		summaryToSheet(summaryRows(ctx)),
		...buildExportDatasets(ctx).map((item) => datasetToSheet(item, ctx.timeZone))
	];
}

// ============================================
// Filenames
// ============================================

/** @param {string} value */
function slugify(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

/**
 * `tracker-<region>-<dataset>-<range>.csv` or `tracker-<region>-<range>.xlsx`.
 * The NEM's `_all` scope reads as `nem`.
 * @param {TrackerExportContext} ctx
 * @param {ExportDatasetKey | 'xlsx'} key
 */
export function exportFileName(ctx, key) {
	const region = ctx.region === '_all' ? 'nem' : slugify(ctx.region);
	const range = slugify(ctx.rangeSlug) || 'range';
	return key === 'xlsx'
		? `tracker-${region}-${range}.xlsx`
		: `tracker-${region}-${key}-${range}.csv`;
}
