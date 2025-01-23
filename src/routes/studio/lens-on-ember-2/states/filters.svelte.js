import { setContext, getContext } from 'svelte';

let filterKey = Symbol('filters');

export class FiltersState {
	/** @type {EmberCountry[] | undefined} */
	countries = $state([]);

	ranges = [
		{
			label: 'Monthly',
			value: 'monthly'
		},
		{
			label: '12 mth rolling',
			value: '12-month-rolling'
		},
		{
			label: 'Yearly',
			value: 'yearly'
		}
	];

	monthlyIntervals = [
		{
			label: 'Month',
			value: '1M'
		},
		{
			label: 'Quarter',
			value: '1Q'
		},
		{
			label: 'Half Year',
			value: '6M'
		},
		{
			label: 'Year',
			value: '1Y'
		}
	];

	rollingIntervals = [
		{
			label: 'Month',
			value: '1M'
		},
		{
			label: 'Quarter',
			value: '1Q'
		},
		{
			label: 'Half Year',
			value: '6M'
		}
	];

	/** @type {string} */
	selectedRegion = $state('');

	/** @type {string} */
	selectedRange = $state('');

	/** @type {string} */
	selectedInterval = $state('');

	/** @type {string} */
	selectedFuelTechGroup = $state('rvf');

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

	/**
	 * @param {{
	 *  countries: EmberCountry[],
	 *  selectedRegion: string,
	 *  selectedRange: string,
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
	setContext(filterKey, filters);
}

/**
 * @returns {FiltersState}
 */
export function getFiltersContext() {
	return getContext(filterKey);
}
