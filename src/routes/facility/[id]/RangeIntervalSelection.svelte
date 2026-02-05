<script>
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	import { rangeList, selectedRange, intervalList, selectedInterval } from '../store';
</script>

<div class="flex gap-2">
	<ButtonGroup
		buttons={$rangeList}
		selected={$selectedRange}
		onclick={(evt) => ($selectedRange = evt.currentTarget.value)}
	/>

	<ButtonGroup
		buttons={$intervalList}
		selected={$selectedInterval}
		onclick={(evt) => ($selectedInterval = evt.currentTarget.value)}
	/>
</div>
