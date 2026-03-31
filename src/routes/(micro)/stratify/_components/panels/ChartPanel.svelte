<script>
	import Switch from '$lib/components/Switch.svelte';
	import ChartTypeSelector from '../ChartTypeSelector.svelte';
	import StylePresetPicker from '../StylePresetPicker.svelte';
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
		<span class="block text-[10px] text-mid-grey uppercase tracking-wide mb-2">Data mode</span>
		<Switch
			buttons={modeButtons}
			selected={project.displayMode}
			onChange={handleModeChange}
		/>
	</div>

	<ChartTypeSelector />
</div>

<div class="mt-3 pt-3 border-t border-warm-grey">
	<p class="text-[10px] text-mid-grey uppercase tracking-wide mb-2">Style</p>
	<StylePresetPicker />
</div>
