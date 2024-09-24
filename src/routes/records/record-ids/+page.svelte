<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import Filters from '../components/Filters.svelte';
	import {
		aggregateOptions,
		periodOptions,
		fuelTechOptions,
		metricOptions
	} from '../page-data-options/filters.js';

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
			: ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem'];

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

	let checkedMetrics =
		data.metrics && data.metrics.length ? data.metrics : metricOptions.map((i) => i.value);

	let selectedSignificance = data.significance || 0;

	let recordIdSearch = data.stringFilter || '';

	$: console.log('data', data);

	$: fetchRecords(
		currentPage,
		checkedRegions,
		checkedPeriods,
		checkedFuelTechs,
		checkedAggregates,
		checkedMetrics,
		selectedSignificance
	);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

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
			`/records/record-ids?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${metricsParam}${significanceParam}`,
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
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				on:click={() => updateCurrentPage(1)}>Back to first page</button
			>
			<button
				class="border rounded text-xs py-1 px-4"
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
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				on:click={() => updateCurrentPage(currentPage + 1)}>Next</button
			>
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				on:click={() => updateCurrentPage(totalPages)}>Jump to last page</button
			>
		</div>
	</div> -->
	<div class="py-5 px-10">
		<table class="w-full text-xs border border-mid-warm-grey p-2">
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th colspan="2" />
					<th colspan="2" class="!text-center">Current Record</th>
					<th colspan="8" />
				</tr>
			</thead>
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th>No.</th>
					<th>Record ID</th>

					<th>Interval</th>
					<th class="!text-right">Value & unit</th>

					<th>Network</th>
					<th>Region</th>
					<th>Fuel Tech</th>

					<th>Period</th>
					<th>Metric</th>
					<th>Aggregate</th>
					<th>Significance</th>
					<th />
				</tr>
			</thead>
			<tbody>
				{#each recordsData as record, i}
					<tr class="border-b border-mid-warm-grey hover:bg-warm-grey">
						<td>{currentStartRecordIndex + i}</td>
						<td>{record.record_id}</td>

						<td class="font-mono text-dark-grey">
							{removeSeconds(record.interval)}
						</td>
						<td>
							<div class="flex justify-end gap-1">
								<span class="font-mono text-black">{auNumber.format(record.value)}</span>
								<span class="text-mid-grey">{record.value_unit}</span>
							</div>
						</td>

						<td>{record.network_id}</td>
						<td>{record.network_region || 'all'}</td>
						<td>{record.fueltech_id || ''}</td>

						<td>{record.period}</td>
						<td>{record.metric}</td>
						<td>{record.aggregate}</td>
						<td>{record.significance}</td>

						<td>
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

<style>
	td,
	th {
		@apply border-r border-mid-warm-grey p-1 align-top text-left;
	}
</style>
