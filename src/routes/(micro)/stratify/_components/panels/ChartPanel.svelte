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

	let showAdvanced = $state(false);
	let overridesText = $state('');
	let parseError = $state('');

	$effect(() => {
		if (showAdvanced) {
			overridesText = project.plotOverrides
				? JSON.stringify(project.plotOverrides, null, 2)
				: '';
			parseError = '';
		}
	});

	/** @param {string} value */
	function handleModeChange(value) {
		project.displayMode = /** @type {'auto' | 'time-series' | 'category'} */ (value);
	}

	/** @param {string} value */
	function handleOverridesInput(value) {
		overridesText = value;

		if (!value.trim()) {
			project.plotOverrides = null;
			parseError = '';
			return;
		}

		try {
			project.plotOverrides = JSON.parse(value);
			parseError = '';
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Invalid JSON';
		}
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

<div class="mt-3 pt-3 border-t border-warm-grey">
	<label class="flex items-center gap-2">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">Chart height</span>
		<input
			type="number"
			min="100"
			max="1200"
			step="50"
			value={project.chartHeight}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= 100 && v <= 1200) project.chartHeight = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">px</span>
	</label>

	<label class="flex items-center gap-2 mt-3">
		<span class="text-[10px] text-mid-grey uppercase tracking-wide">X-axis ticks</span>
		<input
			type="number"
			min="0"
			max="100"
			step="1"
			value={project.xTicks}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				if (v >= 0 && v <= 100) project.xTicks = v;
			}}
			class="w-20 bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
		/>
		<span class="text-[10px] text-mid-grey">0 = auto</span>
	</label>
</div>

<div class="mt-3 pt-3 border-t border-warm-grey">
	<button
		type="button"
		onclick={() => (showAdvanced = !showAdvanced)}
		class="flex items-center gap-1 text-[10px] text-mid-grey uppercase tracking-wide hover:text-dark-grey"
	>
		<span class="text-[8px]">{showAdvanced ? '▼' : '▶'}</span>
		Advanced
	</button>

	{#if showAdvanced}
		<div class="mt-2">
			<p class="text-[10px] text-mid-grey mb-1">Plot overrides (JSON)</p>
			<textarea
				value={overridesText}
				oninput={(e) => handleOverridesInput(e.currentTarget.value)}
				placeholder={'{"y": {"type": "log"}, "layout": {"title": "..."}}'}
				rows="6"
				class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-dark-grey resize-y"
			></textarea>
			{#if parseError}
				<p class="text-[10px] text-red-500 mt-0.5">{parseError}</p>
			{/if}
		</div>
	{/if}
</div>
