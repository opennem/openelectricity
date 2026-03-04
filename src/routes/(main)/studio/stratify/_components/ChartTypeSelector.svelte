<script>
	import Switch from '$lib/components/Switch.svelte';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();

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
	<Switch
		{buttons}
		selected={project.chartType}
		onChange={(value) => (project.chartType = /** @type {'stacked-area' | 'area' | 'line'} */ (value))}
	/>
</div>
