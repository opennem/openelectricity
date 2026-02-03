<script>
	import { run } from 'svelte/legacy';

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import Meta from '$lib/components/Meta.svelte';
	import Filters from './components/Filters.svelte';
	import {
		regionOptions,
		aggregateOptions,
		periodOptions,
		fuelTechOptions
	} from './page-data-options/filters.js';

	let { data } = $props();
	let recordsData = [];
	let totalRecords = $state(0);
	let currentPage = $state(1);
	let currentStartRecordIndex = $derived((currentPage - 1) * 100 + 1);

	let errorMessage = $state('');

	// Default values for filters
	const defaultRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
	const defaultFuelTechs = fuelTechOptions.map((i) => i.value);
	const defaultPeriods = periodOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedRegions = $state(defaultRegions);
	/** @type {string[]} */
	let checkedFuelTechs = $state(defaultFuelTechs);
	/** @type {string[]} */
	let checkedPeriods = $state(defaultPeriods);
	let recordIdSearch = $state('');

	// Sync state from URL params via $effect
	$effect(() => {
		currentPage = data.page || 1;
		checkedRegions = data.regions?.length ? data.regions : defaultRegions;
		checkedFuelTechs = data.fuelTechs?.length ? data.fuelTechs : defaultFuelTechs;
		checkedPeriods = data.periods?.length ? data.periods : defaultPeriods;
		recordIdSearch = data.stringFilter || '';
	});

	function getFilterParams({ regions, periods, fuelTechs, stringFilter }) {
		const validRegions = regions.filter((r) => r !== '_all');
		const regionsParam =
			regions.length === 0 || regions.length === 7 ? '' : '&regions=' + validRegions.join(',');
		const periodsParam =
			periods.length === periodOptions.length ? '' : '&periods=' + periods.join(',');

		const fuelTechParams =
			fuelTechs.length === fuelTechOptions.length ? '' : '&fuelTechs=' + fuelTechs.join(',');

		const recordIdSearchParam = stringFilter
			? `&recordIdFilter=${encodeURIComponent(stringFilter.trim())}`
			: '';

		return {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams
		};
	}

	async function fetchRecords(
		page = 1,
		regions = checkedRegions,
		periods = checkedPeriods,
		fuelTechs = checkedFuelTechs
	) {
		const { regionsParam, periodsParam, recordIdSearchParam, fuelTechParams } = getFilterParams({
			regions,
			periods,
			stringFilter: recordIdSearch,
			fuelTechs
		});

		if (browser) {
			const res2 = await fetch('/api/record-ids?page=' + page);
			const jsonData2 = await res2.json();

			// const res = await fetch(
			// 	`/api/records?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}`
			// );
			// const jsonData = await res.json();

			// console.log('res2', jsonData2);

			if (jsonData2.success) {
				errorMessage = '';
				recordsData = jsonData2.data;
				totalRecords = jsonData2.data.length;
			} else {
				recordsData = [];
				totalRecords = 0;
				errorMessage = jsonData2.error;
			}
		}
	}

	/**
	 * Update the current page
	 * @param {number} page
	 */
	function updateCurrentPage(page) {
		currentPage = page;
		currentStartRecordIndex = (page - 1) * 100 + 1;

		const { regionsParam, periodsParam, recordIdSearchParam, fuelTechParams } = getFilterParams({
			regions: checkedRegions,
			periods: checkedPeriods,
			stringFilter: recordIdSearch,
			fuelTechs: checkedFuelTechs
		});

		goto(
			`/records-checker?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}`,
			{
				replaceState: true
			}
		);
	}

	/**
	 * Handle filters apply
	 * @param {{checkedRegions: string[], checkedPeriods: string[], checkedFuelTechs: string[], recordIdSearch: string}} detail
	 */
	function handleFiltersApply(detail) {
		console.log('Regions', detail.checkedRegions);
		checkedRegions = detail.checkedRegions;
		checkedPeriods = detail.checkedPeriods;
		recordIdSearch = detail.recordIdSearch;
		checkedFuelTechs = detail.checkedFuelTechs;
		updateCurrentPage(1);
	}
	run(() => {
		fetchRecords(currentPage, checkedRegions, checkedPeriods);
	});
	let totalPages = $derived(Math.ceil(totalRecords / 100));
	let currentLastRecordIndex = $derived(currentStartRecordIndex + 99);
	let lastRecordIndex = $derived(
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex
	);
</script>

<Meta title="Records" image="/img/preview.jpg" />

<header class="my-24 flex flex-col w-1/2 mx-auto text-center gap-6">
	<!-- <Filters
		initCheckedRegions={checkedRegions}
		initCheckedPeriods={checkedPeriods}
		initRecordIdSearch={recordIdSearch}
		initCheckedFuelTechs={checkedFuelTechs}
		on:apply={(evt) => handleFiltersApply(evt.detail)}
	/>

	<hr class="my-10" /> -->

	<img
		src="https://upload.wikimedia.org/wikipedia/commons/1/19/Under_construction_graphic.gif"
		alt="Under construction"
		class="w-1/2 mx-auto"
	/>

	<a href="/records-checker/all">All records</a>
	<a href="/records-checker/record-ids">Record IDs</a>
</header>
