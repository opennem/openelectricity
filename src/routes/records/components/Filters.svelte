<script>
	import { createEventDispatcher } from 'svelte';
	import CheckboxTree from '$lib/components/form-elements/CheckboxTree.svelte';
	import Switch from '$lib/components/Switch.svelte';

	import {
		regionOptions,
		aggregateOptions,
		periodOptions,
		fuelTechOptions
	} from '../page-data-options/filters.js';

	const dispatch = createEventDispatcher();

	export let initCheckedRegions;
	export let initCheckedPeriods;
	export let initRecordIdSearch;
	export let initCheckedFuelTechs;

	let filterMode = 'text'; // or checkboxes

	/** @type {string[]} */
	let checkedRegions = initCheckedRegions || ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

	/** @type {string[]} */
	let indeterminateRegions = [];

	/** @type {string[]} */
	let checkedAggregates = ['low', 'high'];

	/** @type {string[]} */
	let checkedPeriods = initCheckedPeriods || periodOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedFuelTechs = initCheckedFuelTechs || fuelTechOptions.map((i) => i.value);

	let recordIdSearch = initRecordIdSearch || '';

	$: if (filterMode === 'text') {
		checkedRegions = initCheckedRegions || ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
		checkedPeriods = initCheckedPeriods || periodOptions.map((i) => i.value);
		checkedFuelTechs = initCheckedFuelTechs || fuelTechOptions.map((i) => i.value);
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

	function handleApplyClick() {
		// console.log('Apply clicked', checkedRegions);
		dispatch('apply', { checkedRegions, checkedPeriods, recordIdSearch, checkedFuelTechs });
	}

	function handleResetClick() {
		checkedRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
		checkedPeriods = periodOptions.map((i) => i.value);
		checkedFuelTechs = fuelTechOptions.map((i) => i.value);
		indeterminateRegions = [];
		recordIdSearch = '';

		dispatch('apply', { checkedRegions, checkedPeriods, recordIdSearch, checkedFuelTechs });
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
	</div>
{/if}
<div class="flex justify-center gap-5 mt-10">
	<button class="border rounded p-3" on:click={handleResetClick}> Reset </button>
	<button class="border rounded p-3 bg-dark-grey text-white" on:click={handleApplyClick}>
		Apply
	</button>
</div>
