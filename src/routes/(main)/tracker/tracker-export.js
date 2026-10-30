/**
 * Data export for the tracker: Timeline's chart and table datasets, its
 * workbook Summary rows and every tracker file name. The dataset shape and
 * its serialisers are shared with other chart cards
 * (`$lib/components/charts/card/export-dataset.js`).
 *
 * Timeline's conventions:
 * - Each chart exports what it draws: the active tab's metric, the series
 *   the table's row toggles leave visible, and the overlays drawn on it.
 * - Values are in base units (MW/MWh, $, $/MWh, tCO2e, kgCO2e/MWh) regardless
 *   of the chart's display prefix or proportion / change-since view; the unit
 *   is in the column header.
 * - Timestamps are the network's local time; the Summary sheet states the zone.
 */

import { headerFor, rowTime } from '$lib/components/charts/card/export-dataset.js';
import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';
import {
	formatNetworkTimestamp,
	networkTimeZoneLabel
} from '$lib/components/charts/v2/network-time.js';
import { contributionLabel } from './tracker-model.js';
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

const TIME_COLUMN = /** @type {const} */ ({ key: 'time', header: 'date', type: 'time' });
const MARKET_VALUE_ID = 'market_value';
const EMISSIONS_ID = 'emissions';
const ENERGY_ID = 'energy_mwh';
/** The renewables overlay line's id, a share of gross demand at every grain. */
const RENEWABLES_LINE_ID = 'renewable-share';

// ============================================
// Labels
// ============================================

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

// ============================================
// Timeline datasets
// ============================================

/**
 * One column per series the chart draws — hidden groups left out — headed
 * with the chart's own label plus the unit.
 * @param {SeriesSnapshot} snapshot
 * @param {string} unit
 * @param {string[]} [hidden]
 * @returns {ExportColumn[]}
 */
function seriesColumns(snapshot, unit, hidden = []) {
	return snapshot.seriesNames
		.filter((name) => !hidden.includes(name))
		.map((name) => ({
			key: name,
			header: headerFor(snapshot.seriesLabels?.[name] ?? name, unit),
			type: 'number'
		}));
}

/**
 * @param {string} key
 * @param {string} title
 * @param {ExportColumn[]} columns
 * @param {Array<Record<string, any>>} rows
 * @returns {ExportDataset | null}
 */
function dataset(key, title, columns, rows) {
	// Filtered charts duplicate their final point to close the stepped band.
	// That drawing-only row is not an observation and must not leave in exports.
	const observations = rows.filter(isObservationRow);
	if (!observations.length || !columns.length) return null;
	return { key, title, columns: [TIME_COLUMN, ...columns], rows: observations };
}

/**
 * The generation overlays as extra columns, joined onto the stack's times:
 * the demand and renewables lines, then each curtailment band. Keys are
 * prefixed so they can't collide with a series id.
 * @param {TrackerExportContext} ctx
 * @returns {Array<{column: ExportColumn, values: Map<number, number | null>}>}
 */
function overlayColumns(ctx) {
	const unit = generationUnit(ctx.basis);
	/** @param {Array<Record<string, any>>} rows @param {string} valueKey */
	const byTime = (rows, valueKey) =>
		new Map(
			rows.flatMap((row) => {
				const time = rowTime(row);
				return time === null ? [] : [[time, row[valueKey] ?? null]];
			})
		);
	return [
		...ctx.overlayLines.map((line) => ({
			column: {
				key: `overlay:${line.id}`,
				header:
					line.id === RENEWABLES_LINE_ID
						? 'Renewables (% of gross demand)'
						: `${line.label} (${line.scale === 'percent' ? '%' : unit})`,
				type: /** @type {const} */ ('number')
			},
			values: byTime(line.data, line.valueKey)
		})),
		...ctx.overlayAreas.flatMap((area) =>
			area.series.map((series) => ({
				column: {
					key: `overlay:${series.id}`,
					header: `${series.label} (${unit})`,
					type: /** @type {const} */ ('number')
				},
				values: byTime(area.data, series.id)
			}))
		)
	];
}

/** The stack's visible series, then the overlays drawn over it.
 * @param {TrackerExportContext} ctx */
function generationDataset(ctx) {
	if (!ctx.generation) return null;
	const overlays = overlayColumns(ctx);
	const rows = overlays.length
		? ctx.generation.data.map((row) => {
				const time = rowTime(row);
				return {
					...row,
					...Object.fromEntries(
						overlays.map(({ column, values }) => [
							column.key,
							time === null ? null : (values.get(time) ?? null)
						])
					)
				};
			})
		: ctx.generation.data;
	return dataset(
		'generation',
		'Generation',
		[
			...seriesColumns(ctx.generation, generationUnit(ctx.basis), ctx.hiddenSeries),
			...overlays.map(({ column }) => column)
		],
		rows
	);
}

/**
 * The Market card's tab. Spot price exports as it arrives; market value
 * exports the visible series. The volume-weighted price chart holds only
 * the components (market value + energy) and derives the line at display
 * time — the export does the same, and keeps the components so the ratio is
 * reproducible.
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
	const marketValue = ctx.priceMetric === 'market_value';
	return dataset(
		'market',
		'Market',
		seriesColumns(ctx.price, marketValue ? '$' : '$/MWh', marketValue ? ctx.hiddenSeries : []),
		ctx.price.data
	);
}

/**
 * The Emissions card's tab. Volume exports the visible series; intensity is
 * derived from the emissions + energy components exactly as the chart draws
 * it (the chart already excludes hidden groups from both).
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
		seriesColumns(ctx.emissions, 'tCO2e', ctx.hiddenSeries),
		ctx.emissions.data
	);
}

/**
 * The fuel-tech table as displayed: sources, loads, the curtailment section
 * and the Demand / Renewables summary rows, with a `Type` column standing in
 * for the table's headings. Values are the raw window statistics behind the
 * formatted cells; the partial flags mirror the table's * markers (a ratio
 * over only the periods with market value or emissions).
 * @param {TrackerExportContext} ctx
 * @returns {ExportDataset | null}
 */
function tableDataset(ctx) {
	if (!ctx.tableRows?.length) return null;
	const contributionHeader = `Contribution (${contributionLabel(ctx.contributionMode)})`;
	/** @type {ExportColumn[]} */
	const columns = [
		{ key: 'label', header: 'Technology', type: 'string' },
		{ key: 'type', header: 'Type', type: 'string' },
		{ key: 'energyMWh', header: 'Energy (MWh)', type: 'number' },
		{ key: 'avPowerMW', header: 'Av power (MW)', type: 'number' },
		{ key: 'contributionPct', header: contributionHeader, type: 'number' },
		{ key: 'vwPrice', header: 'Av price ($/MWh)', type: 'number' },
		{ key: 'vwPricePartial', header: 'Av price partial', type: 'boolean' },
		{ key: 'emissionsT', header: 'Emissions (tCO2e)', type: 'number' },
		{ key: 'intensityKgPerMWh', header: 'Intensity (kgCO2e/MWh)', type: 'number' },
		{ key: 'intensityPartial', header: 'Intensity partial', type: 'boolean' },
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
		vwPricePartial: row.vwPricePartial,
		emissionsT: row.emissionsT,
		intensityKgPerMWh: row.intensityKgPerMWh,
		intensityPartial: row.intensityPartial,
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
 * One Timeline download as its card draws it, or null while its data
 * hasn't arrived.
 * @param {ExportDatasetKey} key
 * @param {TrackerExportContext} ctx
 * @returns {ExportDataset | null}
 */
export function timelineDataset(key, ctx) {
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

// ============================================
// Summary
// ============================================

/** @param {TrackerExportContext['generationTransform']} transform */
function transformNote(transform) {
	if (transform === 'proportion') return 'Chart shows shares; values exported in base units';
	if (transform === 'changeSince')
		return 'Chart shows change since the start; values exported in base units';
	if (transform === 'growth')
		return 'Chart shows growth (each bucket’s change from the one it is compared with); values exported in base units';
	return '';
}

/**
 * Timeline's Summary rows: what the charts show and the caveats a reader
 * needs (timezone, hidden groups, chart transforms). The shell adds the
 * provenance (sheets, generated time, source URL).
 * @param {TrackerExportContext} ctx
 * @returns {Array<[string, string]>}
 */
export function timelineSummaryRows(ctx) {
	/** @type {Array<[string, string]>} */
	const rows = [
		['View', 'Timeline'],
		['Region', ctx.regionLabel],
		['Range', ctx.rangeLabel],
		['Interval', ctx.intervalLabel],
		['Window start', formatNetworkTimestamp(ctx.window.start, ctx.timeZone)],
		['Window end', formatNetworkTimestamp(ctx.window.end, ctx.timeZone)],
		['Timezone', `${networkTimeZoneLabel(ctx.timeZone)} — all timestamps are network-local`],
		['Fuel tech grouping', ctx.groupLabel],
		['Contribution basis', contributionLabel(ctx.contributionMode)],
		['Generation', ctx.basis === 'energy' ? 'Energy (MWh)' : 'Power (MW)'],
		['Market', marketModeLabel(ctx.priceMetric)],
		['Emissions', emissionsModeLabel(ctx.emissionsMetric)]
	];
	const overlays = [
		...ctx.overlayLines.map((line) => line.label),
		...ctx.overlayAreas.flatMap((area) => area.series.map((series) => series.label))
	];
	if (overlays.length) rows.push(['Generation overlays', overlays.join(', ')]);
	const generationNote = transformNote(ctx.generationTransform);
	if (generationNote) rows.push(['Generation view', generationNote]);
	const marketNote = ctx.priceMetric === 'market_value' && transformNote(ctx.marketValueTransform);
	if (marketNote) rows.push(['Market value view', marketNote]);
	if (ctx.hiddenSeries.length) {
		const labels = ctx.hiddenSeries.map((id) => ctx.generation?.seriesLabels?.[id] ?? id);
		rows.push(['Hidden groups', `${labels.join(', ')} — left out of every chart, as drawn`]);
	}
	if (ctx.rooftopForecast)
		rows.push(['Rooftop forecast', "AEMO's forecast top-up is drawn but not exported"]);
	return rows;
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
 * Every tracker download is named `tracker-<scope>[-<dataset>]-<range>.<ext>`
 * — Timeline's charts, each Profile chart, the date comparison and each
 * Compare chart alike. The NEM's `_all` scope reads as `nem`.
 * @param {{ scope: string, dataset?: string, range: string, extension: 'csv' | 'xlsx' }} parts
 */
export function trackerFileName({ scope, dataset = '', range, extension }) {
	const name = [
		'tracker',
		scope === '_all' ? 'nem' : slugify(scope),
		slugify(dataset),
		slugify(range) || 'range'
	].filter(Boolean);
	return `${name.join('-')}.${extension}`;
}

/**
 * `tracker-<region>-<dataset>-<range>.csv` or `tracker-<region>-<range>.xlsx`.
 * @param {Pick<TrackerExportContext, 'region' | 'rangeSlug'>} ctx
 * @param {string} key - The download's id, or 'xlsx' for the workbook
 */
export function exportFileName(ctx, key) {
	return trackerFileName({
		scope: ctx.region,
		dataset: key === 'xlsx' ? '' : key,
		range: ctx.rangeSlug,
		extension: key === 'xlsx' ? 'xlsx' : 'csv'
	});
}
