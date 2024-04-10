<script>
	import { LayerCake, Svg } from 'layercake';

	import ColourBarSwatch from '$lib/components/charts/elements/ColourBarSwatch.svelte';
	import ColourBarRamp from '$lib/components/charts/elements/ColourBarRamp.svelte';
	import LinearGradient from '$lib/components/charts/elements/defs/LinearGradient.svelte';

	import { colours, labels, colourRanges, stops } from './helpers.js';

	export let mode = 'live';
</script>

{#if mode === 'live'}
	<div class="chart-container" style="width: 300px;">
		<p class="text-sm font-bold mb-1 flex gap-3 items-center">
			Price
			<small class="text-xs text-mid-grey font-semibold">$/MWh</small>
		</p>
		<LayerCake>
			<Svg>
				<ColourBarSwatch {colours} {labels} ranges={colourRanges} />
			</Svg>
		</LayerCake>
	</div>
{:else}
	<div class="chart-container" style="width: 300px;">
		<p class="text-sm font-bold mb-1 flex gap-3 items-center">
			Carbon Intensity
			<small class="text-xs text-mid-grey font-semibold">kgCO₂e/MWh</small>
		</p>
		<LayerCake>
			<Svg>
				<defs>
					<LinearGradient id="intensity-ramp-gradient" {stops} />
				</defs>
				<ColourBarRamp fill="url(#intensity-ramp-gradient)" />
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
