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
		class="rounded-full w-4 h-4 border border-white"
		style="background-color: {colour};"
	></span>
</div>
