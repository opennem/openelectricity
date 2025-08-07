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
	let pageSize = 1000;
	let recordsData = $state([]);
	let totalRecords = $state(0);
	let currentPage = $state(data.page || 1);
	let currentStartRecordIndex = $state((currentPage - 1) * pageSize + 1);

	let errorMessage = $state('');

	/** @type {string[]} */
	let checkedRegions = $state(
		data.regions && data.regions.length
			? data.regions
			: ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem']
	);

	/** @type {string[]} */
	let checkedFuelTechs = $state(
		data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : fuelTechOptions.map((i) => i.value)
	);

	/** @type {string[]} */
	let checkedPeriods = $state(
		data.periods && data.periods.length ? data.periods : periodOptions.map((i) => i.value)
	);

	/** @type {string[]} */
	let checkedAggregates = $state(
		data.aggregates && data.aggregates.length
			? data.aggregates
			: aggregateOptions.map((i) => i.value)
	);

	let checkedMetrics = $state(
		data.metrics && data.metrics.length ? data.metrics : metricOptions.map((i) => i.value)
	);

	let selectedSignificance = $state(data.significance || 0);

	let recordIdSearch = $state(data.stringFilter || '');

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
				`/api/records?page=${page}&pageSize=${pageSize}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${metricsParam}${significanceParam}`
			);
			const jsonData = await res.json();

			if (jsonData.success) {
				errorMessage = '';
				recordsData = jsonData.data;
				totalRecords = jsonData.total_records;
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
		currentStartRecordIndex = (page - 1) * pageSize + 1;

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
			`/records-checker/all?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${metricsParam}${significanceParam}`,
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
		console.log('data.metaRespones', data.metadata);
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
	let totalPages = $derived(Math.ceil(totalRecords / pageSize));
	let currentLastRecordIndex = $derived(currentStartRecordIndex + pageSize - 1);
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

	<h4 class="text-center">{totalRecords} records</h4>
</header>

{#if errorMessage}
	<div class="flex items-center justify-center h-64">
		<p class="text-red">{errorMessage}</p>
	</div>
{/if}

{#if recordsData.length > 0}
	<div class="py-5 flex justify-center gap-16">
		<div class="flex gap-5">
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				onclick={() => updateCurrentPage(1)}>Back to first page</button
			>
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				onclick={() => updateCurrentPage(currentPage - 1)}>Previous</button
			>
		</div>

		<div class="text-xs text-center">
			Page {currentPage} of {totalPages}
			<br />
			({currentStartRecordIndex} to {lastRecordIndex})
		</div>

		<div class="flex gap-5">
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				onclick={() => updateCurrentPage(currentPage + 1)}>Next</button
			>
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				onclick={() => updateCurrentPage(totalPages)}>Jump to last page</button
			>
		</div>
	</div>
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
				{#each recordsData as record, i}
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
