<script>
	import { LayerCake, Svg } from 'layercake';

	import ColourBarSwatch from '$lib/components/charts/elements/ColourBarSwatch.svelte';
	import ColourBarRamp from '$lib/components/charts/elements/ColourBarRamp.svelte';
	import LinearGradient from '$lib/components/charts/elements/defs/LinearGradient.svelte';

	import { colours, labels, colourRanges } from './helpers.js';
	import { theme, carbonIntensityStops } from '$lib/stores/theme.js';

	/**
	 * @typedef {Object} Props
	 * @property {string} [mode]
	 */

	/** @type {Props} */
	let { mode = 'live' } = $props();

	let max = $derived($theme === 'opennem' ? 1000 : 800);
</script>

{#if mode === 'live'}
	<div class="chart-container">
		<p class="text-xs mb-1 flex flex-col md:flex-row gap-0 md:gap-3 pb-3 leading-xs">
			Price
			<small class="text-xs text-mid-grey font-light">$/MWh</small>
		</p>
		<LayerCake>
			<Svg>
				<ColourBarSwatch {colours} {labels} ranges={colourRanges} />
			</Svg>
		</LayerCake>
	</div>
{:else}
	<div class="chart-container">
		<p class="text-xs mb-1 flex flex-col md:flex-row gap-0 md:gap-3 pb-3 leading-xs">
			Carbon Intensity
			<small class="text-xs text-mid-grey font-light">kgCO₂e/MWh</small>
		</p>
		<LayerCake>
			<Svg>
				<defs>
					<LinearGradient id="intensity-ramp-gradient" stops={$carbonIntensityStops} />
				</defs>
				<ColourBarRamp fill="url(#intensity-ramp-gradient)" {max} />
			</Svg>
		</LayerCake>
	</div>
{/if}

<style>
	.chart-container {
		width: 100%;
		height: 50px;
	}
</style>
