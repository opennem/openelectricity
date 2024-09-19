<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import Filters from './components/Filters.svelte';
	import {
		regionOptions,
		aggregateOptions,
		periodOptions,
		fuelTechOptions
	} from './page-data-options/filters.js';

	export let data;
	let recordsData = [];
	let totalRecords = 0;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * 100 + 1;

	let errorMessage = '';

	/** @type {string[]} */
	let checkedRegions =
		data.regions && data.regions.length
			? data.regions
			: ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

	/** @type {string[]} */
	let checkedFuelTechs =
		data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : fuelTechOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedPeriods =
		data.periods && data.periods.length ? data.periods : periodOptions.map((i) => i.value);

	let recordIdSearch = data.stringFilter || '';

	$: fetchRecords(currentPage, checkedRegions, checkedPeriods);
	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

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
			`/records?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}`,
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
</script>

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

	<a href="/records/all">All records</a>
	<a href="/records/record-ids">Record IDs</a>
</header>
