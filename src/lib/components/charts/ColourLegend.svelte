<script>
	import { LayerCake, Svg } from 'layercake';

	import ColourBarSwatch from './elements/ColourBarSwatch.svelte';
	import ColourBarRamp from './elements/ColourBarRamp.svelte';
	import LinearGradient from './elements/defs/LinearGradient.svelte';

	export let mode = 'live';
	const colourRanges = [0, 0.0625, 0.0656, 0.0688, 0.0813, 0.125, 0.375, 1];
	const colours = [
		'#F2F1EE',
		'#D1D0CD',
		'#B0B0AE',
		'#91918F',
		'#737372',
		'#565655',
		'#3B3B3B',
		'#222222'
	];
	const labels = ['-$1k', '$0', '$50', '$100', '$300', '$1k', '$5k', '$15k'];

	const stops = [
		{ offset: '0%', color: '#21956C' },
		{ offset: '25%', color: '#8BB97A' },
		{ offset: '50%', color: '#E9FFAA' },
		{ offset: '75%', color: '#A6A36F' },
		{ offset: '100%', color: '#594929' }
	];
</script>

{#if mode === 'live'}
	<div class="chart-container" style="width: 300px;">
		<LayerCake>
			<Svg>
				<ColourBarSwatch {colours} {labels} ranges={colourRanges} />
			</Svg>
		</LayerCake>
	</div>
{:else}
	<div class="chart-container" style="width: 300px;">
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
