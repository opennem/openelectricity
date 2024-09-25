<script>
	import { group, rollup } from 'd3-array';
	import { timeDay, timeMonth } from 'd3-time';

	import { browser } from '$app/environment';

	import Meta from '$lib/components/Meta.svelte';
	import Switch from '$lib/components/Switch.svelte';

	import PinnedRecords from './components/PinnedRecords.svelte';
	import List from './components/List.svelte';
	import fetchRecords from './page-data-options/fetch';
	import {
		aggregateOptions,
		periodOptions,
		fuelTechOptions,
		milestoneTypeOptions
	} from './page-data-options/filters.js';

	export let data;

	const regions = [
		{ value: 'au.nem', shortValue: '', label: 'NEM' },
		{ value: 'au.nem.nsw1', shortValue: 'nsw1', label: 'NSW' },
		{ value: 'au.nem.qld1', shortValue: 'qld1', label: 'QLD' },
		{ value: 'au.nem.sa1', shortValue: 'sa1', label: 'SA' },
		{ value: 'au.nem.tas1', shortValue: 'tas1', label: 'TAS' },
		{ value: 'au.nem.vic1', shortValue: 'vic1', label: 'VIC' }
	];
	let selectedRegion = regions[0].value;

	let errorMessage = '';
	/** @type {MilestoneRecord[]} */
	let recordsData = [];
	let totalRecords = 0;
	let pageSize = 500;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * pageSize + 1;

	//TODO: refactor to store
	/** @type {string[]} */
	let checkedRegions = data.regions && data.regions.length ? data.regions : ['nem'];

	/** @type {string[]} */
	let checkedFuelTechs =
		data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : fuelTechOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedPeriods =
		data.periods && data.periods.length ? data.periods : periodOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedAggregates =
		data.aggregates && data.aggregates.length
			? data.aggregates
			: aggregateOptions.map((i) => i.value);

	let checkedMilestoneTypes =
		data.milestoneTypes && data.milestoneTypes.length
			? data.milestoneTypes
			: milestoneTypeOptions.map((i) => i.value);

	let selectedSignificance = data.significance || 0;

	let recordIdSearch = data.stringFilter || '';

	$: if (browser) {
		fetchRecords(
			currentPage,
			checkedRegions,
			checkedPeriods,
			checkedFuelTechs,
			checkedAggregates,
			checkedMilestoneTypes,
			selectedSignificance,
			recordIdSearch,
			pageSize
		).then((res) => {
			errorMessage = res.errorMessage;
			recordsData = res.recordsData;
			totalRecords = res.totalRecords;
		});
	}

	$: {
		let selectedRegionShortValue = regions.find((r) => r.value === selectedRegion)?.shortValue;
		if (selectedRegionShortValue) {
			checkedRegions = [selectedRegionShortValue];
		}
	}

	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

	$: rolledUpRecords = rollup(
		recordsData,
		(/** @type {MilestoneRecord[]} */ d) => {
			const latestTime = d.map((d) => d.time).reduce((a, b) => Math.max(a, b), 0);
			return {
				time: latestTime,
				date: new Date(latestTime),
				records: group(d, (d) => d.record_id)
			};
		},
		(/** @type {MilestoneRecord} */ d) => timeMonth(d.date),
		(/** @type {MilestoneRecord} */ d) => timeDay(d.date)
	);
	// $: sortedRolledUpRecords = Array.from(rolledUpRecords.values()).sort((a, b) => b.time - a.time);
	$: console.log('rolledUpRecords', rolledUpRecords);
	// $: console.log('sortedRolledUpRecords', sortedRolledUpRecords);
</script>

<Meta title="Records" image="/img/preview.jpg" />

<!-- <div class="grid grid-cols-6 divide-x">
	<div class="col-span-2 flex justify-end">
		<section class="w-[400px] bg-mid-grey">
			<h2>Records</h2>

			<div>
				<h4>Filters</h4>
			</div>
		</section>
	</div> -->

<div>
	<section class="container my-12">
		<h2 class="text-center">Records</h2>

		<div class="flex justify-center mb-12">
			<Switch
				buttons={regions}
				selected={selectedRegion}
				on:change={(evt) => (selectedRegion = evt.detail.value)}
				class="justify-center"
			/>
		</div>

		<PinnedRecords region={selectedRegion} />
	</section>

	<div class="h-[50px] bg-warm-grey py-6">
		<div class="container">
			<h6>Filters</h6>
		</div>
	</div>

	<main class="bg-light-warm-grey min-h-[600px] py-12">
		<List {rolledUpRecords} />
	</main>
</div>
