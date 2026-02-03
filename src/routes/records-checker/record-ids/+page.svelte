<script>
	import { run } from 'svelte/legacy';

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import Filters from '../components/Filters.svelte';
	import {
		aggregateOptions,
		periodOptions,
		fuelTechOptions,
		metricOptions
	} from '../page-data-options/filters.js';

	let { data } = $props();
	let recordsData = $state([]);
	let totalRecords = $state(0);
	let currentPage = $state(1);
	let currentStartRecordIndex = $derived((currentPage - 1) * 100 + 1);

	let errorMessage = $state('');

	// Default values for filters
	const defaultRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem'];
	const defaultFuelTechs = fuelTechOptions.map((i) => i.value);
	const defaultPeriods = periodOptions.map((i) => i.value);
	const defaultAggregates = aggregateOptions.map((i) => i.value);
	const defaultMetrics = metricOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedRegions = $state(defaultRegions);
	/** @type {string[]} */
	let checkedFuelTechs = $state(defaultFuelTechs);
	/** @type {string[]} */
	let checkedPeriods = $state(defaultPeriods);
	/** @type {string[]} */
	let checkedAggregates = $state(defaultAggregates);
	let checkedMetrics = $state(defaultMetrics);
	let selectedSignificance = $state(0);
	let recordIdSearch = $state('');

	// Sync state from URL params via $effect
	$effect(() => {
		currentPage = data.page || 1;
		checkedRegions = data.regions?.length ? data.regions : defaultRegions;
		checkedFuelTechs = data.fuelTechs?.length ? data.fuelTechs : defaultFuelTechs;
		checkedPeriods = data.periods?.length ? data.periods : defaultPeriods;
		checkedAggregates = data.aggregates?.length ? data.aggregates : defaultAggregates;
		checkedMetrics = data.metrics?.length ? data.metrics : defaultMetrics;
		selectedSignificance = data.significance || 0;
		recordIdSearch = data.stringFilter || '';
	});

	/**
	 * Get the filter params
	 * @param {{
	 * 	regions: string[],
	 * 	periods: string[],
	 * 	fuelTechs: string[],
	 * 	stringFilter: string,
	 * 	aggregates: string[],
	 * 	metrics: string[],
	 * 	significance: number
	 * }} params
	 */
	function getFilterParams({
		regions,
		periods,
		fuelTechs,
		stringFilter,
		aggregates,
		metrics,
		significance
	}) {
		const validRegions = regions.filter((r) => r !== '_all');

		// 8 as in ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem']
		const regionsParam =
			regions.length === 0 || regions.length === 8 ? '' : '&regions=' + validRegions.join(',');

		const periodsParam =
			periods.length === periodOptions.length ? '' : '&periods=' + periods.join(',');

		const aggregatesParam =
			aggregates.length === aggregateOptions.length ? '' : '&aggregates=' + aggregates.join(',');

		const metricsParam =
			metrics.length === metricOptions.length ? '' : '&metrics=' + metrics.join(',');

		const fuelTechParams =
			fuelTechs.length === fuelTechOptions.length ? '' : '&fuelTechs=' + fuelTechs.join(',');

		const recordIdSearchParam = stringFilter
			? `&recordIdFilter=${encodeURIComponent(stringFilter.trim())}`
			: '';

		const significanceParam = significance ? `&significance=${significance}` : '';

		return {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams,
			aggregatesParam,
			metricsParam,
			significanceParam
		};
	}

	async function fetchRecords(
		page = 1,
		regions = checkedRegions,
		periods = checkedPeriods,
		fuelTechs = checkedFuelTechs,
		aggregates = checkedAggregates,
		metrics = checkedMetrics,
		significance = selectedSignificance
	) {
		const {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams,
			aggregatesParam,
			metricsParam,
			significanceParam
		} = getFilterParams({
			regions,
			periods,
			stringFilter: recordIdSearch,
			fuelTechs,
			aggregates,
			metrics,
			significance
		});

		if (browser) {
			const res = await fetch(
				`/api/record-ids?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${metricsParam}${significanceParam}`
			);
			const jsonData = await res.json();

			if (jsonData.success) {
				errorMessage = '';
				recordsData = jsonData.data;
				totalRecords = recordsData.length;
			} else {
				recordsData = [];
				totalRecords = 0;
				errorMessage = jsonData.error;
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

		const {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams,
			aggregatesParam,
			metricsParam,
			significanceParam
		} = getFilterParams({
			regions: checkedRegions,
			periods: checkedPeriods,
			stringFilter: recordIdSearch,
			fuelTechs: checkedFuelTechs,
			aggregates: checkedAggregates,
			metrics: checkedMetrics,
			significance: selectedSignificance
		});

		goto(
			`/records-checker/record-ids?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${metricsParam}${significanceParam}`,
			{
				replaceState: true
			}
		);
	}

	/**
	 * Handle filters apply
	 * @param {{
	 * 	checkedRegions: string[],
	 * 	checkedPeriods: string[],
	 * 	checkedFuelTechs: string[],
	 * 	checkedAggregates: string[],
	 *  checkedMetrics: string[],
	 * 	selectedSignificance: number,
	 * 	recordIdSearch: string
	 * }} detail
	 */
	function handleFiltersApply(detail) {
		console.log('Filters', detail);
		checkedRegions = detail.checkedRegions;
		checkedPeriods = detail.checkedPeriods;
		recordIdSearch = detail.recordIdSearch;
		checkedFuelTechs = detail.checkedFuelTechs;
		checkedAggregates = detail.checkedAggregates;
		checkedMetrics = detail.checkedMetrics;
		selectedSignificance = detail.selectedSignificance;

		updateCurrentPage(1);
	}

	// remove seconds and time difference from timestamp
	function removeSeconds(timestamp) {
		return timestamp.slice(0, -9);
	}

	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});
	run(() => {
		console.log('data', data);
	});
	run(() => {
		fetchRecords(
			currentPage,
			checkedRegions,
			checkedPeriods,
			checkedFuelTechs,
			checkedAggregates,
			checkedMetrics,
			selectedSignificance
		);
	});
	let currentLastRecordIndex = $derived(currentStartRecordIndex + 99);
	let lastRecordIndex = $derived(
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex
	);
</script>

<header class=" mt-12">
	<Filters
		initCheckedRegions={checkedRegions}
		initCheckedPeriods={checkedPeriods}
		initRecordIdSearch={recordIdSearch}
		initCheckedFuelTechs={checkedFuelTechs}
		initCheckedAggregates={checkedAggregates}
		initCheckedMetrics={checkedMetrics}
		initSelectedSignificance={selectedSignificance}
		on:apply={(evt) => handleFiltersApply(evt.detail)}
	/>

	<hr class="my-10" />

	<h4 class="text-center">{totalRecords} record IDs</h4>
</header>

{#if errorMessage}
	<div class="flex items-center justify-center h-64">
		<p class="text-red">{errorMessage}</p>
	</div>
{/if}

{#if recordsData.length > 0}
	<!-- <div class="py-5 flex justify-center gap-16">
		<div class="flex gap-5">
			<button
				class="border rounded-sm text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				on:click={() => updateCurrentPage(1)}>Back to first page</button
			>
			<button
				class="border rounded-sm text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				on:click={() => updateCurrentPage(currentPage - 1)}>Previous</button
			>
		</div>

		<div class="text-xs text-center">
			Page {currentPage} of {totalPages}
			<br />
			({currentStartRecordIndex} to {lastRecordIndex})
		</div>

		<div class="flex gap-5">
			<button
				class="border rounded-sm text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				on:click={() => updateCurrentPage(currentPage + 1)}>Next</button
			>
			<button
				class="border rounded-sm text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				on:click={() => updateCurrentPage(totalPages)}>Jump to last page</button
			>
		</div>
	</div> -->
	<div class="py-5 px-10">
		<table class="w-full text-xs border border-mid-warm-grey p-2">
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th class="border-r border-mid-warm-grey p-1 align-top text-left" colspan="2"></th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left" colspan="2"
						>Current Record</th
					>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left" colspan="8"></th>
				</tr>
			</thead>
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">No.</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Record ID</th>

					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Interval</th>
					<th class="text-right border-r border-mid-warm-grey p-1 align-top">Value & unit</th>

					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Network</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Region</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Fuel Tech</th>

					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Period</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Metric</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Aggregate</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left">Significance</th>
					<th class="border-r border-mid-warm-grey p-1 align-top text-left"></th>
				</tr>
			</thead>
			<tbody>
				{#each recordsData as record, i (record.record_id)}
					<tr class="border-b border-mid-warm-grey hover:bg-warm-grey">
						<td>{currentStartRecordIndex + i}</td>
						<td>{record.record_id}</td>

						<td
							class="font-mono text-dark-grey border-r border-mid-warm-grey p-1 align-top text-left"
						>
							{removeSeconds(record.interval)}
						</td>
						<td class="text-right border-r border-mid-warm-grey p-1 align-top">
							<div class="flex justify-end gap-1">
								<span class="font-mono text-black">{auNumber.format(record.value)}</span>
								<span class="text-mid-grey">{record.value_unit}</span>
							</div>
						</td>

						<td class="border-r border-mid-warm-grey p-1 align-top text-left"
							>{record.network_id}</td
						>
						<td class="border-r border-mid-warm-grey p-1 align-top text-left"
							>{record.network_region || 'all'}</td
						>
						<td class="border-r border-mid-warm-grey p-1 align-top text-left"
							>{record.fueltech_id || ''}</td
						>

						<td class="border-r border-mid-warm-grey p-1 align-top text-left">{record.period}</td>
						<td class="border-r border-mid-warm-grey p-1 align-top text-left">{record.metric}</td>
						<td class="border-r border-mid-warm-grey p-1 align-top text-left">{record.aggregate}</td
						>
						<td class="border-r border-mid-warm-grey p-1 align-top text-left"
							>{record.significance}</td
						>

						<td class="border-r border-mid-warm-grey p-1 align-top text-left">
							<a
								class="p-1 text-xxs border border-mid-warm-grey text-mid-grey bg-light-warm-grey"
								href="/records/{encodeURIComponent(record.record_id)}"
							>
								History
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
