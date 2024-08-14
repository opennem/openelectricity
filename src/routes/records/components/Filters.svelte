<script>
	import { createEventDispatcher } from 'svelte';
	import CheckboxTree from '$lib/components/form-elements/CheckboxTree.svelte';
	import regionOptions from '../page-data-options/regions.js';

	const dispatch = createEventDispatcher();

	/** @type {string[]} */
	let checkedRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

	/** @type {string[]} */
	let indeterminateRegions = [];

	/**
	 * Handle region change
	 * @param {string} region
	 */
	function handleRegionCheck(region) {
		if (region === '_all') {
			checkedRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
			indeterminateRegions = [];
			// checkedRegions = checkedRegions.length === nodes.length ? [] : nodes.map((n) => n.value);
		} else if (checkedRegions.includes(region)) {
			indeterminateRegions = ['_all'];
			checkedRegions = checkedRegions.filter((r) => r !== region);
		} else {
			checkedRegions = [...checkedRegions, region];

			// includes all
			if (checkedRegions.length === 7) {
				indeterminateRegions = [];
			}
		}
	}

	function handleApplyClick() {
		console.log('Apply clicked', checkedRegions);
		dispatch('apply', { checkedRegions });
	}

	function hanldeResetClick() {
		checkedRegions = ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];
		indeterminateRegions = [];

		dispatch('apply', { checkedRegions });
	}
</script>

<div class="flex justify-center">
	<CheckboxTree
		nodes={regionOptions}
		checked={checkedRegions}
		indeterminate={indeterminateRegions}
		on:change={(evt) => handleRegionCheck(evt.detail.node)}
	/>
</div>

<div class="flex justify-center gap-5 mt-10">
	<button class="border rounded p-3" on:click={hanldeResetClick}> Reset </button>
	<button class="border rounded p-3 bg-dark-grey text-white" on:click={handleApplyClick}>
		Apply
	</button>
</div>
