import { setContext, getContext } from 'svelte';
import { INTERVAL_LABELS } from '$lib/utils/intervals';
import { rangeIntervalMap } from '../page-data-options/config';
import rangeIntervalXFormattersGetters from '$lib/utils/range-interval-ticks-formatters';

/** @typedef {import('./filters.d.ts').RangeType} RangeType */

const FILTERS_KEY = Symbol('filters');

export class FiltersState {
	/** @type {EmberCountry[] | undefined} */
	countries = $state([]);

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
	selectedFuelTechGroup = $state('rvf');

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
	selectedRegionLabel = $derived.by(() => {
		const find = this.countries?.find((country) => country.iso === this.selectedRegion);
		return find ? find.name : '';
	});

	/** @type {boolean} */
	is12MthRollingSum = $derived(this.selectedRange === '12-month-rolling');

	/** @type {boolean} */
	isMonthly = $derived(this.selectedRange === 'monthly');

	/** @type {boolean} */
	isYearly = $derived(this.selectedRange === 'yearly');

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
	 *  countries: EmberCountry[],
	 *  selectedRegion: string,
	 *  selectedRange: RangeType | undefined,
	 *  selectedInterval: string
	 * }} props
	 */
	constructor({ countries, selectedRegion, selectedRange, selectedInterval }) {
		this.countries = countries;
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
