<script>
	import { statusColours } from '../_utils/filters.js';

	// committed, operating, retired
	let { status, isCommissioning = false } = $props();

	let colour = $derived(
		isCommissioning ? statusColours.commissioning : statusColours[status] || statusColours.operating
	);
</script>

<div class="flex">
	<span class="w-3 h-3 rounded-full" style="background-color: {colour};"></span>
</div>
