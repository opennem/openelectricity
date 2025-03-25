import { setContext, getContext } from 'svelte';
import { INTERVAL_LABELS } from '$lib/utils/intervals';
import rangeIntervalXFormattersGetters from '$lib/utils/range-interval-ticks-formatters';
import { rangeIntervalMap } from '../helpers/config';
import { regionsWithLabels } from '../helpers/regions';
const FILTERS_KEY = Symbol('filters');

export class FiltersState {
	ranges = Object.keys(rangeIntervalMap).map((d) => ({
		label: rangeIntervalMap[d].label,
		value: d
	}));

	/** @type {string} */
	selectedRegion = $state('');

	/** @type {RangeType | undefined} */
	selectedRange = $state();

	/** @type {string} */
	selectedInterval = $state('');

	/** @type {string} */
	selectedFuelTechGroup = $state('detailed');

	/** @type {{label: string, value: string}[] | undefined} */
	selectedRangeIntervals = $derived.by(() => {
		if (!this.selectedRange) return undefined;

		let range = rangeIntervalMap[this.selectedRange];

		if (!range.intervals) return undefined;

		return range.intervals.map((interval) => ({
			label: INTERVAL_LABELS[interval],
			value: interval
		}));
	});

	/** @type {string} */
	selectedRegionLabel = $derived(regionsWithLabels[this.selectedRegion] || this.selectedRegion);

	valueFormatters = $derived(
		this.selectedRange
			? rangeIntervalXFormattersGetters(this.selectedRange, this.selectedInterval)
			: {
					ticks: () => undefined,
					format: (/** @type {*} */ d) => d,
					formatTick: (/** @type {*} */ d) => d
				}
	);

	/**
	 * @param {{
	 *  selectedRegion: string,
	 *  selectedRange: RangeType | undefined,
	 *  selectedInterval: string
	 * }} props
	 */
	constructor({ selectedRegion, selectedRange, selectedInterval }) {
		this.selectedRegion = selectedRegion;
		this.selectedRange = selectedRange;
		this.selectedInterval = selectedInterval;
	}
}

/**
 * @param {FiltersState} filters
 */
export function setFiltersContext(filters) {
	setContext(FILTERS_KEY, filters);
}

/**
 * @returns {FiltersState}
 */
export function getFiltersContext() {
	return getContext(FILTERS_KEY);
}
