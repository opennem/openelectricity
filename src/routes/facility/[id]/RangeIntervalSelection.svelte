<script>
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	import { rangeList, selectedRange, intervalList, selectedInterval } from '../store';
</script>

<div class="flex gap-2">
	<ButtonGroup
		buttons={$rangeList}
		selected={$selectedRange}
		on:click={(/** @type {*} */ evt) => ($selectedRange = evt.target.value)}
	/>

	<ButtonGroup
		buttons={$intervalList}
		selected={$selectedInterval}
		on:click={(/** @type {*} */ evt) => ($selectedInterval = evt.target.value)}
	/>
</div>
