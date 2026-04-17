<script>
	import { statusColours } from '$lib/theme/openelectricity';

	// committed, operating, retired
	let { status, isCommissioning = false, size = 'default' } = $props();

	let colour = $derived(
		isCommissioning ? statusColours.commissioning : statusColours[status] || statusColours.operating
	);

	let sizeClass = $derived(
		size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
	);
</script>

<div class="flex">
	<span
		class="rounded-full {sizeClass} border border-white"
		style="background-color: {colour};"
	></span>
</div>
