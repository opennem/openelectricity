/**
 * Facility page chart cards — each card's download and comparison, built
 * from what its chart reports drawing (`ChartSnapshot`), plus the workbook's
 * Summary rows and the download file names. Pure module: the page passes in
 * the snapshots and its selection.
 *
 * Cards: Generation (a stack by unit, power or energy), Curtailment (the
 * region's, by technology), Market (the derived price line(s), or market
 * value by unit) and Emissions (the intensity line, or volume by unit).
 * Values are base units: MW / MWh, $/MWh, $, kgCO₂e/MWh, tCO₂e.
 */

import { networkTimeZoneLabel } from '$lib/components/charts/v2/network-time.js';
import { getRegionLongLabel } from '$lib/facilities/filters.js';
import { formatGenerationUnitValue } from '$lib/components/charts/network/generation-units.js';
import { seriesDataset } from '$lib/components/charts/card/export-dataset.js';
import {
	compareBuckets,
	lineCompareSource,
	stackCompareSource
} from '$lib/components/charts/card/compare/snapshot-sources.js';
import {
	formatDollarsCompact,
	formatFixed,
	tonnesPrefix
} from '$lib/components/charts/card/cell-format.js';

/** @typedef {import('$lib/components/charts/card/types.js').ChartSnapshot} ChartSnapshot */
/** @typedef {'generation' | 'curtailment' | 'market' | 'emissions'} FacilityCard */
/**
 * What the cards draw and how: the generation basis, each pair's tab and
 * the series the units panel hides.
 * @typedef {{
 *   basis: 'power' | 'energy',
 *   marketTab: 'price' | 'mv',
 *   emissionsTab: 'intensity' | 'volume',
 *   hidden: string[],
 *   loadIds?: string[]
 * }} FacilityCardView
 */

/** The facility page's cards, in page order. */
export const FACILITY_CARDS = /** @type {const} */ ([
	'generation',
	'curtailment',
	'market',
	'emissions'
]);

/** Each card's heading, as the dialog and workbook name it. */
export const FACILITY_CARD_TITLES = /** @type {const} */ ({
	generation: 'Generation',
	curtailment: 'Curtailment',
	market: 'Market',
	emissions: 'Emissions'
});

/**
 * What a card's chart plots in base units, as its download headers read.
 * @param {FacilityCard} card @param {FacilityCardView} view
 */
export function facilityCardUnit(card, view) {
	if (card === 'market') return view.marketTab === 'price' ? '$/MWh' : '$';
	if (card === 'emissions') return view.emissionsTab === 'intensity' ? 'kgCO2e/MWh' : 'tCO2e';
	return view.basis === 'energy' ? 'MWh' : 'MW';
}

/** Whether a card draws a stack (units or technologies) rather than a line.
 * @param {FacilityCard} card @param {FacilityCardView} view */
function stacked(card, view) {
	if (card === 'market') return view.marketTab === 'mv';
	if (card === 'emissions') return view.emissionsTab === 'volume';
	return true;
}

/**
 * A card's download as drawn: the visible series over the window.
 * @param {FacilityCard} card @param {ChartSnapshot | null} snapshot @param {FacilityCardView} view
 */
export function facilityCardDataset(card, snapshot, view) {
	return seriesDataset({
		key: card,
		title: FACILITY_CARD_TITLES[card],
		snapshot,
		unit: facilityCardUnit(card, view),
		hidden: stacked(card, view) ? view.hidden : []
	});
}

/**
 * Where a card's download stands: loading until its chart reports, then
 * ready with data or empty.
 * @param {FacilityCard} card @param {ChartSnapshot | null} snapshot @param {FacilityCardView} view
 * @returns {import('$lib/components/charts/card/types.js').DownloadState}
 */
export function facilityCardState(card, snapshot, view) {
	if (!snapshot) return 'loading';
	return facilityCardDataset(card, snapshot, view) ? 'ready' : 'empty';
}

/**
 * A card's comparison. Stacks compare by unit (Generation, market value,
 * emissions volume) or technology (Curtailment); the price and intensity
 * lines compare as A and B tiles over the window, or as independent lines
 * where the price splits by direction.
 * @param {FacilityCard} card
 * @param {ChartSnapshot | null} snapshot
 * @param {FacilityCardView & {
 *   held: Record<number, Record<string, any>>,
 *   formatTime: (time: number) => string,
 *   facilityCode: string,
 *   zone: string,
 *   interval: string
 * }} context
 * @returns {import('$lib/components/charts/card/types.js').CompareSource | null}
 */
export function facilityCompareSource(card, snapshot, context) {
	if (!snapshot) return null;
	const shared = {
		held: context.held,
		formatTime: context.formatTime,
		context: [
			{ key: 'facility', header: 'Facility', value: context.facilityCode },
			{ key: 'timeZone', header: 'Network time', value: networkTimeZoneLabel(context.zone) },
			{ key: 'interval', header: 'Interval', value: context.interval }
		]
	};
	const energy = context.basis === 'energy';
	const power = {
		unit: energy ? 'MWh' : 'MW',
		baseUnit: energy ? 'MWh' : 'MW',
		format: (/** @type {number | null} */ value) => formatGenerationUnitValue(value, 'M', 'M')
	};
	if (card === 'generation') {
		return stackCompareSource(snapshot, {
			...shared,
			...power,
			title: 'Generation comparison',
			rowHeader: 'Unit',
			hidden: context.hidden,
			loadIds: context.loadIds
		});
	}
	if (card === 'curtailment') {
		return stackCompareSource(snapshot, {
			...shared,
			...power,
			title: 'Curtailment comparison',
			note: 'The region’s curtailment for this fuel technology, not this facility’s.'
		});
	}
	if (card === 'market' && context.marketTab === 'price') {
		return lineCompareSource(snapshot, {
			...shared,
			title: 'Price comparison',
			label: 'Price',
			unit: '$/MWh',
			baseUnit: '$/MWh',
			format: (value) => formatFixed(value)
		});
	}
	if (card === 'market') {
		return stackCompareSource(snapshot, {
			...shared,
			title: 'Market value comparison',
			rowHeader: 'Unit',
			hidden: context.hidden,
			unit: '$',
			baseUnit: '$',
			format: formatDollarsCompact
		});
	}
	if (context.emissionsTab === 'intensity') {
		return lineCompareSource(snapshot, {
			...shared,
			title: 'Emissions intensity comparison',
			label: 'Emissions intensity',
			unit: 'kgCO₂e/MWh',
			baseUnit: 'kgCO2e/MWh',
			format: (value) => formatGenerationUnitValue(value, 'k', 'k')
		});
	}
	const largest = Math.max(
		0,
		...compareBuckets(snapshot).flatMap((row) =>
			snapshot.seriesNames
				.filter((id) => !context.hidden.includes(id))
				.map((id) => Math.abs(row[id] ?? 0))
		)
	);
	const tonnes = tonnesPrefix(largest);
	return stackCompareSource(snapshot, {
		...shared,
		title: 'Emissions comparison',
		rowHeader: 'Unit',
		hidden: context.hidden,
		unit: `${tonnes}tCO₂e`,
		baseUnit: 'tCO2e',
		format: (value) => formatGenerationUnitValue(value, '', tonnes)
	});
}

/**
 * The workbook's Summary rows: which facility, window and interval, and the
 * zone every timestamp is in.
 * @param {{ facility: any, rangeLabel: string, intervalLabel: string, timeZone: string }} input
 * @returns {Array<[string, string]>}
 */
export function facilitySummaryRows({ facility, rangeLabel, intervalLabel, timeZone }) {
	return [
		['Facility', `${facility?.name ?? ''} (${facility?.code ?? ''})`],
		[
			'Region',
			facility ? getRegionLongLabel(facility.network_id, String(facility.network_region ?? '')) : ''
		],
		['Range', rangeLabel],
		['Interval', intervalLabel],
		['Timezone', `${networkTimeZoneLabel(timeZone)} — all timestamps are network-local`]
	];
}

/**
 * `<code>-<id>-<range>.csv` for a card (as the page's downloads were always
 * named), `<code>-<range>.xlsx` for the workbook.
 * @param {string} code @param {string} rangeSlug
 * @param {string | null} id @param {'csv' | 'xlsx'} extension
 */
export function facilityFileName(code, rangeSlug, id, extension) {
	const parts = [code.toLowerCase() || 'facility', ...(id ? [id] : []), rangeSlug];
	return `${parts.join('-')}.${extension}`;
}
