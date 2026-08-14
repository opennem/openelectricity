<script>
	import MapIcon from '@lucide/svelte/icons/map';
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';
	import { MAP_TYPES } from '$lib/stratify/chart-types.js';

	/** @type {{ chart: Record<string, any> }} */
	let { chart } = $props();

	const RENDER_WIDTH = 520;
	let host = $state(/** @type {HTMLDivElement | null} */ (null));
	let width = $state(0);
	let visible = $state(false);
	let isMap = $derived(MAP_TYPES.has(chart.chartType));
	let previewChart = $derived({
		...chart,
		title: '',
		description: '',
		dataSource: '',
		notes: '',
		showLegend: false,
		chartHeight: 280,
		animateAsOneChart: false,
		animationAutoPlay: false
	});

	$effect(() => {
		if (!host) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					visible = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '240px' }
		);
		observer.observe(host);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={host}
	bind:clientWidth={width}
	class="relative aspect-[16/10] w-full overflow-hidden bg-light-warm-grey"
>
	{#if isMap}
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-mid-grey">
			<MapIcon size={34} strokeWidth={1.4} />
			<span class="font-space text-xxs font-medium uppercase tracking-wider">Map example</span>
		</div>
	{:else if visible && width > 0}
		<div
			class="pointer-events-none absolute left-0 top-0 origin-top-left p-4 text-dark-grey"
			style="width: {RENDER_WIDTH}px; transform: scale({width / RENDER_WIDTH});"
		>
			<StrataChartView chart={previewChart} />
		</div>
	{:else}
		<div class="absolute inset-0 animate-pulse bg-warm-grey/60"></div>
	{/if}
</div>
