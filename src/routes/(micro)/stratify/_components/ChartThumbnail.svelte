<script>
	import MapIcon from '@lucide/svelte/icons/map';
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';
	import { MAP_TYPES } from '$lib/stratify/chart-types.js';

	/**
	 * Small chart preview: renders the chart at a fixed 500×400 size, then
	 * scales it down to the card width. Map charts get a static placeholder
	 * instead of spinning up a WebGL context per card. `muted` dims the
	 * preview (used for draft cards).
	 * @type {{ chart: import('../_utils/api.js').ChartDoc, muted?: boolean }}
	 */
	let { chart, muted = false } = $props();

	const RENDER_WIDTH = 500;
	const RENDER_HEIGHT = 400;

	let thumbWidth = $state(0);

	let isMap = $derived(MAP_TYPES.has(chart.chartType));

	// Blank the header/footer fields so only the plot renders (the card shows
	// the title itself); fixed chartHeight keeps thumbnails uniform and
	// animations stay off in a grid of previews.
	let thumbChart = $derived({
		...chart,
		title: '',
		description: '',
		dataSource: '',
		notes: '',
		showLegend: false,
		chartHeight: 340,
		animateAsOneChart: false,
		animationAutoPlay: false
	});
</script>

<div
	class="relative w-full aspect-[5/4] overflow-hidden {muted
		? 'bg-light-warm-grey/60'
		: 'bg-white'}"
	bind:clientWidth={thumbWidth}
>
	{#if isMap}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-light-warm-grey text-mid-grey"
		>
			<MapIcon size={28} strokeWidth={1.5} />
			<span class="text-[10px]">Map chart</span>
		</div>
	{:else if thumbWidth > 0}
		<!-- Explicit text colour so Plot's currentColor axes don't inherit the
		     card link's red (global `a` styling in app.css) -->
		<div
			class="absolute top-0 left-0 origin-top-left pointer-events-none p-3 text-dark-grey {muted
				? 'opacity-75'
				: ''}"
			style="width: {RENDER_WIDTH}px; height: {RENDER_HEIGHT}px; transform: scale({thumbWidth /
				RENDER_WIDTH});"
		>
			<StrataChartView chart={thumbChart} />
		</div>
	{/if}
</div>
