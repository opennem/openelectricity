<script>
	import { setContext, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	import Meta from '$lib/components/Meta.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';

	import { regionsWithLabels } from '$lib/regions';
	import { regions } from './page-data-options/filters.js';

	import PinnedRecords from './components/PinnedRecords.svelte';
	import List from './components/List.svelte';
	import Table from './components/Table.svelte';
	import Filters from './components/Filters.svelte';
	import FilterTags from './components/FilterTags.svelte';
	import fetchRecords from './page-data-options/fetch';
	import { aggregateOptions, getFilterParams } from './page-data-options/filters';
	import filtersStore from './stores/filters';
	import groupByMonthDay from './page-data-options/group-by-month-day';

	let { data } = $props();

	setContext('records-filters', filtersStore());

	const {
		selectedView,
		selectedRegion,
		selectedRegions,
		selectedFuelTechs,
		selectedMetrics,
		selectedPeriods
	} = getContext('records-filters');

	let errorMessage = $state('');
	/** @type {MilestoneRecord[]} */
	let recordsData = $state([]);
	let totalRecords = $state(0);
	let pageSize = 250;
	// let currentPage = $state(data.page || 1);
	let currentPage = 1;
	let currentStartRecordIndex = $state((currentPage - 1) * pageSize + 1);

	$selectedRegions = data && data.regions && data.regions.length ? data.regions : [];
	$selectedFuelTechs = data && data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : [];
	$selectedPeriods = data && data.periods && data.periods.length ? data.periods : [];
	$selectedMetrics = data && data.metrics && data.metrics.length ? data.metrics : [];

	/** @type {string[]} */
	let checkedAggregates =
		data && data.aggregates && data.aggregates.length
			? data.aggregates
			: aggregateOptions.map((i) => i.value);

	let selectedSignificance = (data && data.significance) || 8;
	let recordIdSearch = (data && data.stringFilter) || '';

	// $: console.log('rolledUpRecords', rolledUpRecords);

	/**
	 * Update the current page
	 * @param {number} page
	 */
	function updateCurrentPage(page) {
		currentPage = page;
		currentStartRecordIndex = (page - 1) * pageSize + 1;

		const { regionsParam, periodsParam, fuelTechParams, metricsParam } = getFilterParams({
			regions: $selectedRegions,
			periods: $selectedPeriods,
			stringFilter: recordIdSearch,
			fuelTechs: $selectedFuelTechs,
			aggregates: checkedAggregates,
			metrics: $selectedMetrics,
			significance: selectedSignificance
		});

		let regionsParam2 = regionsParam;
		if (regionsParam2.charAt(0) !== '?') {
			regionsParam2 = '?' + regionsParam2.slice(1);
		}

		goto(`/records${regionsParam2}${periodsParam}${fuelTechParams}${metricsParam}`, {
			noScroll: true
		});
	}
	$effect(() => {
		if (browser) {
			fetchRecords(
				currentPage,
				$state.snapshot($selectedRegions),
				$selectedPeriods,
				$selectedFuelTechs,
				checkedAggregates,
				$selectedMetrics,
				selectedSignificance,
				recordIdSearch,
				pageSize
			).then((res) => {
				errorMessage = res.errorMessage;
				recordsData = res.recordsData;
				totalRecords = res.totalRecords;

				console.log('recordsData', recordsData);
				// get unique metics in recordsData
				const uniqueMetrics = [...new Set(recordsData.map((r) => r.metric))];
				console.log('uniqueMetrics', uniqueMetrics);
			});
		}
	});
	$effect(() => {
		if (
			browser &&
			($selectedRegions || $selectedPeriods || $selectedFuelTechs || $selectedMetrics)
		) {
			updateCurrentPage(1);
		}
	});
	let selectedLongValueRegion = $derived(
		regions.find((r) => r.value === $selectedRegion)?.longValue
	);
	let totalPages = $derived(Math.ceil(totalRecords / 100));
	let currentLastRecordIndex = $derived(currentStartRecordIndex + 99);
	let lastRecordIndex = $derived(
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex
	);
	let rolledUpRecords = $derived(groupByMonthDay(recordsData));

	let regionOptions = $derived(
		regions.map((r) => ({
			label: r.label,
			value: r.value,
			divider: r.divider,
			labelClassName: regions?.find((m) => m.value === r.longValue)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedRegions = [value];
		} else if ($selectedRegions.includes(value)) {
			$selectedRegions = $selectedRegions.filter((item) => item !== value);
		} else {
			$selectedRegions = [...$selectedRegions, value];
		}
	}

	let regionLabel = $derived.by(() => {
		if ($selectedRegions.length === 0) {
			return 'Region';
		} else if ($selectedRegions.length === 1) {
			let region = regions.find((r) => r.value === $selectedRegions[0]);
			return region?.longLabel || $selectedRegions[0];
		} else {
			return `${$selectedRegions.length} Regions`;
		}
	});
</script>

<Meta
	title="Records"
	description="Real-time records from the Australian electricity network"
	image="/img/records-preview.jpg"
/>

<div class="bg-light-warm-grey">
	<section class="md:container py-12">
		<div class="flex items-center gap-2 justify-between md:justify-center pl-10 pr-5 md:px-0">
			<h2 class="text-xl md:text-2xl mb-0 md:mb-12">Records</h2>
			<!-- <div class="md:hidden flex justify-center text-sm">
				<FormSelect
					options={regions.map((r) => ({ label: r.longLabel, value: r.value }))}
					selected={$selectedRegion}
					paddingX="px-4"
					paddingY="py-3"
					align="right"
					on:change={(evt) => ($selectedRegions = [evt.detail.value])}
				/>
			</div> -->
		</div>

		<!-- <div class="hidden md:flex justify-center mb-12">
			<Switch
				buttons={regions}
				selected={$selectedRegion}
				on:change={(evt) => ($selectedRegions = [evt.detail.value])}
				class="justify-center bg-white text-xxs md:text-sm"
			/>
		</div> -->

		<div class="inline-flex ml-5 mt-5">
			<FormMultiSelect
				options={regionOptions}
				selected={$selectedRegions}
				label={regionLabel}
				paddingX="pl-5 pr-4"
				paddingY="py-3"
				onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
			/>
		</div>

		<div class="pb-10 pt-5 md:pb-6 md:pt-3">
			<PinnedRecords selectedRegions={$selectedRegions} initialData={data.pinnedRecords} />
		</div>
	</section>
</div>

<div class="bg-light-warm-grey pt-10">
	<div class="md:container pb-1">
		<h4 class="mx-5 font-space text-mid-grey uppercase text-sm tracking-wider">Most recent</h4>
	</div>
</div>

<div class="border-y border-warm-grey py-3 relative text-base" style="z-index: 9999;">
	<Filters />
</div>

<div class="text-base">
	<div class="md:container md:grid grid-cols-8 md:divide-x divide-warm-grey py-12">
		<div class="col-span-2 px-10 md:pl-7 md:pr-12">
			<div class="sticky top-10 hidden md:block">
				<FilterTags />
			</div>
		</div>

		{#if $selectedView === 'list'}
			<main class="min-h-[600px] col-span-6 md:pl-12 px-6">
				<List {rolledUpRecords} />
			</main>
		{:else}
			<main class="min-h-[600px] col-span-6 md:pl-6 pr-0">
				<Table dataset={recordsData} />
			</main>
		{/if}
	</div>
</div>
