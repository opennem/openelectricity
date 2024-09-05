<script>
	import { createEventDispatcher } from 'svelte';
	import CheckboxTree from '$lib/components/form-elements/CheckboxTree.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import Radio from '$lib/components/form-elements/Radio.svelte';

	import {
		regionOptions,
		aggregateOptions,
		periodOptions,
		fuelTechOptions,
		metricOptions
	} from '../page-data-options/filters.js';

	const dispatch = createEventDispatcher();

	export let initCheckedRegions;
	export let initCheckedPeriods;
	export let initRecordIdSearch;
	export let initCheckedFuelTechs;
	export let initCheckedAggregates;
	export let initCheckedMetrics;
	export let initSelectedSignificance;

	let filterMode = 'checkboxes'; // text or checkboxes

	/** @type {string[]} */
	let checkedRegions = initCheckedRegions || ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

	/** @type {string[]} */
	let indeterminateRegions = [];

	/** @type {string[]} */
	let checkedPeriods = initCheckedPeriods || periodOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedFuelTechs = initCheckedFuelTechs || fuelTechOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedAggregates = initCheckedAggregates || aggregateOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedMetrics = initCheckedMetrics || metricOptions.map((i) => i.value);

	let selectedSignificance = initSelectedSignificance || 0;

	let recordIdSearch = initRecordIdSearch || '';

	$: if (filterMode === 'text') {
		checkedRegions = initCheckedRegions || ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
		checkedPeriods = initCheckedPeriods || periodOptions.map((i) => i.value);
		checkedFuelTechs = initCheckedFuelTechs || fuelTechOptions.map((i) => i.value);
		checkedAggregates = initCheckedAggregates || aggregateOptions.map((i) => i.value);
		checkedMetrics = initCheckedMetrics || metricOptions.map((i) => i.value);
		selectedSignificance = initSelectedSignificance || 0;
		indeterminateRegions = [];
	} else {
		recordIdSearch = initRecordIdSearch || '';
	}

	/**
	 * Handle region change
	 * @param {string} region
	 */
	function handleRegionChange(region) {
		if (region === '_all') {
			checkedRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
			indeterminateRegions = [];
		} else if (checkedRegions.includes(region)) {
			indeterminateRegions = ['_all'];
			checkedRegions = checkedRegions.filter((r) => r !== region);
		} else {
			checkedRegions = [...checkedRegions, region];

			if (checkedRegions.length === 7) {
				indeterminateRegions = [];
			}
		}
	}

	function handlePeriodChange(period) {
		if (checkedPeriods.includes(period)) {
			if (checkedPeriods.length === 1) {
				checkedPeriods = periodOptions.map((i) => i.value);
			} else {
				checkedPeriods = checkedPeriods.filter((i) => i !== period);
			}
		} else {
			checkedPeriods = [...checkedPeriods, period];
		}
	}

	function handleFuelTechChange(fuelTech) {
		if (checkedFuelTechs.includes(fuelTech)) {
			if (checkedFuelTechs.length === 1) {
				checkedFuelTechs = fuelTechOptions.map((i) => i.value);
			} else {
				checkedFuelTechs = checkedFuelTechs.filter((i) => i !== fuelTech);
			}
		} else {
			checkedFuelTechs = [...checkedFuelTechs, fuelTech];
		}
	}

	function handleAggregateChange(value) {
		if (checkedAggregates.includes(value)) {
			if (checkedAggregates.length === 1) {
				checkedAggregates = aggregateOptions.map((i) => i.value);
			} else {
				checkedAggregates = checkedAggregates.filter((i) => i !== value);
			}
		} else {
			checkedAggregates = [...checkedAggregates, value];
		}
	}

	function handleMetricChange(value) {
		if (checkedMetrics.includes(value)) {
			if (checkedMetrics.length === 1) {
				checkedMetrics = metricOptions.map((i) => i.value);
			} else {
				checkedMetrics = checkedMetrics.filter((i) => i !== value);
			}
		} else {
			checkedMetrics = [...checkedMetrics, value];
		}
	}

	function handleApplyClick() {
		// console.log('Apply clicked', checkedRegions);
		dispatchApply();
	}

	function handleResetClick() {
		checkedRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
		checkedPeriods = periodOptions.map((i) => i.value);
		checkedFuelTechs = fuelTechOptions.map((i) => i.value);
		checkedAggregates = aggregateOptions.map((i) => i.value);
		checkedMetrics = metricOptions.map((i) => i.value);
		indeterminateRegions = [];
		recordIdSearch = '';
		selectedSignificance = 0;

		dispatchApply();
	}

	function dispatchApply() {
		dispatch('apply', {
			checkedRegions,
			checkedPeriods,
			recordIdSearch,
			checkedFuelTechs,
			checkedAggregates,
			checkedMetrics,
			selectedSignificance
		});
	}
</script>

<div class="flex justify-center my-8">
	<Switch
		buttons={[
			{ label: 'Record ID Filter', value: 'text' },
			{ label: 'Options', value: 'checkboxes' }
		]}
		selected={filterMode}
		class="text-xs"
		on:change={(evt) => (filterMode = evt.detail.value)}
	/>
</div>
{#if filterMode === 'text'}
	<div class="flex justify-center divide-x divide-mid-warm-grey">
		<div class="px-10">
			<h5>Record ID text search</h5>
			<input
				bind:value={recordIdSearch}
				type="search"
				class="border rounded p-3 w-full"
				placeholder="Search by record ID"
			/>
		</div>
	</div>
{/if}

{#if filterMode === 'checkboxes'}
	<div class="flex justify-center divide-x divide-mid-warm-grey">
		<div class="px-10">
			<h5>Regions</h5>
			<CheckboxTree
				nodes={regionOptions}
				checked={checkedRegions}
				indeterminate={indeterminateRegions}
				on:change={(evt) => handleRegionChange(evt.detail.node)}
			/>
		</div>

		<div class="px-10">
			<h5>Fuel Technology</h5>
			<CheckboxTree
				nodes={fuelTechOptions}
				checked={checkedFuelTechs}
				on:change={(evt) => handleFuelTechChange(evt.detail.node)}
			/>
		</div>

		<div class="px-10">
			<h5>Periods</h5>
			<CheckboxTree
				nodes={periodOptions}
				checked={checkedPeriods}
				on:change={(evt) => handlePeriodChange(evt.detail.node)}
			/>
		</div>

		<div class="px-10">
			<h5>Aggregate</h5>
			<CheckboxTree
				nodes={aggregateOptions}
				checked={checkedAggregates}
				on:change={(evt) => handleAggregateChange(evt.detail.node)}
			/>
		</div>

		<div class="px-10">
			<h5>Metric</h5>
			<CheckboxTree
				nodes={metricOptions}
				checked={checkedMetrics}
				on:change={(evt) => handleMetricChange(evt.detail.node)}
			/>
		</div>

		<div class="px-10">
			<h5>Significance</h5>
			<Radio
				name="significance"
				label="9+"
				value={9}
				checked={selectedSignificance}
				on:change={() => (selectedSignificance = 9)}
			/>

			<Radio
				name="significance"
				label="6+"
				value={6}
				checked={selectedSignificance}
				on:change={() => (selectedSignificance = 6)}
			/>

			<Radio
				name="significance"
				label="3+"
				value={3}
				checked={selectedSignificance}
				on:change={() => (selectedSignificance = 3)}
			/>

			<Radio
				name="significance"
				label="1+"
				value={1}
				checked={selectedSignificance}
				on:change={() => (selectedSignificance = 1)}
			/>

			<Radio
				name="significance"
				label="All"
				value={0}
				checked={selectedSignificance}
				on:change={() => (selectedSignificance = 0)}
			/>
		</div>
	</div>
{/if}
<div class="flex justify-center gap-5 mt-10">
	<button class="border rounded p-3" on:click={handleResetClick}> Reset </button>
	<button class="border rounded p-3 bg-dark-grey text-white" on:click={handleApplyClick}>
		Apply
	</button>
</div>
