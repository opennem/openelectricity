<script>
	import Switch from '$lib/components/Switch.svelte';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();

	const timeSeriesButtons = [
		{ label: 'Stacked Area', value: 'stacked-area' },
		{ label: 'Area', value: 'area' },
		{ label: 'Line', value: 'line' }
	];

	const categoryButtons = [{ label: 'Grouped Bar', value: 'grouped-bar' }];

	let buttons = $derived(project.isCategory ? categoryButtons : timeSeriesButtons);
</script>

<div>
	<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
		>Chart type</span
	>
	<Switch
		{buttons}
		selected={project.chartType}
		onChange={(value) =>
			(project.chartType =
				/** @type {'stacked-area' | 'area' | 'line' | 'grouped-bar'} */ (value))}
	/>
</div>
