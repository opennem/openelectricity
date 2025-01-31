import { setContext, getContext } from 'svelte';
import { getFormattedDate } from '$lib/utils/formatters';

/** @typedef {import('./filters.d.ts').RangeType} RangeType */

const FILTERS_KEY = Symbol('filters');

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

	/** @type {Record<RangeType, {xTicks: number | undefined, formatTickX: (d: Date) => string, formatX: (d: Date) => string}>} */
	xTicksAndFormatters = {
		monthly: {
			xTicks: undefined,
			formatTickX: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit'),
			formatX: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit')
		},
		'12-month-rolling': {
			xTicks: 6,
			formatTickX: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', 'numeric'),
			formatX: (/** @type {Date} */ d) =>
				'Year to ' + getFormattedDate(d, undefined, undefined, 'short', 'numeric')
		},
		yearly: {
			xTicks: 6,
			formatTickX: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric'),
			formatX: (/** @type {Date} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
		}
	};

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

	/** @type {RangeType | undefined} */
	selectedRange = $state();

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

	selectedRangeXTicks = $derived(
		this.selectedRange ? this.xTicksAndFormatters[this.selectedRange].xTicks : undefined
	);

	selectedRangeFormatTickX = $derived(
		this.selectedRange
			? this.xTicksAndFormatters[this.selectedRange].formatTickX
			: (/** @type {*} */ d) => d
	);

	selectedRangeFormatX = $derived(
		this.selectedRange
			? this.xTicksAndFormatters[this.selectedRange].formatX
			: (/** @type {*} */ d) => d
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
