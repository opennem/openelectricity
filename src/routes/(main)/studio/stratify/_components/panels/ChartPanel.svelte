<script>
	import Switch from '$lib/components/Switch.svelte';
	import ChartTypeSelector from '../ChartTypeSelector.svelte';
	import { getStratifyContext } from '../../_state/context.js';

	const project = getStratifyContext();

	const modeButtons = [
		{ label: 'Auto', value: 'auto' },
		{ label: 'Dates', value: 'time-series' },
		{ label: 'Categories', value: 'category' }
	];

	/** @param {string} value */
	function handleModeChange(value) {
		project.displayMode = /** @type {'auto' | 'time-series' | 'category'} */ (value);
	}
</script>

<div class="flex flex-col gap-3">
	<div>
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider">Data mode</span>
		<Switch
			buttons={modeButtons}
			selected={project.displayMode}
			onChange={handleModeChange}
		/>
	</div>

	<ChartTypeSelector />
</div>
