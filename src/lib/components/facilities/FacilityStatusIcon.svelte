<script>
	import { statusColours } from '$lib/theme/openelectricity';

	// committed, commissioning, operating, retired
	let { status, size = 'default' } = $props();

	let colour = $derived(statusColours[status] || statusColours.operating);

	let sizeClass = $derived(size === 'lg' ? 'w-5 h-5' : 'w-4 h-4');

	let isOperating = $derived(status === 'operating');
</script>

<div class="flex">
	<span
		class="rounded-full {sizeClass} border border-white"
		style="background-color: {colour};{isOperating ? ` box-shadow: 0 0 6px ${colour};` : ''}"
	></span>
</div>
