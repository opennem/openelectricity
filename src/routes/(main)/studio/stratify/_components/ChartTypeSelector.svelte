<script>
	import Switch from '$lib/components/Switch.svelte';

	let { selected = $bindable('stacked-area') } = $props();

	const buttons = [
		{ label: 'Stacked Area', value: 'stacked-area' },
		{ label: 'Area', value: 'area' },
		{ label: 'Line', value: 'line' }
	];
</script>

<div>
	<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
		>Chart type</span
	>
	<Switch {buttons} {selected} onChange={(value) => (selected = value)} />
</div>
