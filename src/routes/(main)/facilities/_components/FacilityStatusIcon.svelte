<script>
	import { statusColours } from '../_utils/filters.js';

	// committed, operating, retired
	let { status, isCommissioning = false, size = 'default' } = $props();

	let colour = $derived(
		isCommissioning ? statusColours.commissioning : statusColours[status] || statusColours.operating
	);
</script>

<div class="flex">
	<span
		class="rounded-full"
		class:w-3={size === 'default'}
		class:h-3={size === 'default'}
		class:w-2={size === 'small'}
		class:h-2={size === 'small'}
		style="background-color: {colour};"
	></span>
</div>
