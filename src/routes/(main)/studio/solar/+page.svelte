<script>
	import { tick } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import IconArrowDownTray from '$lib/icons/ArrowDownTray.svelte';
	import SolarHeatmap from './components/SolarHeatmap.svelte';
	import HeatmapTooltip from './components/HeatmapTooltip.svelte';
	import ColorLegend from './components/ColorLegend.svelte';

	let { data } = $props();

	let selectedYear = $state(2025);
	let hoveredCell = $state(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	let selectedData = $derived(data.yearData[selectedYear]);

	// Small multiples: oldest to newest (left to right)
	const smallMultipleYears = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

	let playing = $state(false);
	let playInterval = $state(null);

	/** @type {Record<number, HTMLElement>} */
	let thumbnailRefs = {};
	let scrollContainer = $state(null);
	let isScrollingProgrammatically = $state(false);

	// Scroll selected thumbnail to center
	$effect(() => {
		const year = selectedYear;
		tick().then(() => {
			const el = thumbnailRefs[year];
			if (el) {
				isScrollingProgrammatically = true;
				el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
				// Reset flag after scroll completes
				setTimeout(() => {
					isScrollingProgrammatically = false;
				}, 500);
			}
		});
	});

	function handleScrollEnd() {
		if (isScrollingProgrammatically || playing || !scrollContainer) return;
		const containerCenter = scrollContainer.scrollLeft + scrollContainer.offsetWidth / 2;
		let closestYear = selectedYear;
		let closestDist = Infinity;
		for (const year of smallMultipleYears) {
			const el = thumbnailRefs[year];
			if (!el) continue;
			const elCenter = el.offsetLeft + el.offsetWidth / 2;
			const dist = Math.abs(elCenter - containerCenter);
			if (dist < closestDist) {
				closestDist = dist;
				closestYear = year;
			}
		}
		if (closestYear !== selectedYear) {
			selectedYear = closestYear;
		}
	}

	function handleHeroHover(cell) {
		hoveredCell = cell;
		tooltipX = cell.x;
		tooltipY = cell.y;
	}

	function handleHeroHoverEnd() {
		hoveredCell = null;
	}

	function handleThumbnailClick(year) {
		stopAnimation();
		selectedYear = year;
		hoveredCell = null;
		document.getElementById('hero-chart')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function toggleAnimation() {
		if (playing) {
			stopAnimation();
		} else {
			startAnimation();
		}
	}

	function startAnimation() {
		selectedYear = smallMultipleYears[0];
		playing = true;
		playInterval = setInterval(() => {
			const idx = smallMultipleYears.indexOf(selectedYear);
			selectedYear = smallMultipleYears[(idx + 1) % smallMultipleYears.length];
		}, 800);
	}

	function stopAnimation() {
		playing = false;
		if (playInterval) {
			clearInterval(playInterval);
			playInterval = null;
		}
	}
</script>

<Meta
	title="Solar Heatmap"
	description="Visualises solar's growing share of Australia's electricity generation since 2013."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">When the Sun Powers the Grid</h1>
	</div>
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[600px] mx-auto">
			Each row is a day, each column a 30-minute interval. Colour intensity shows solar's percentage
			of total NEM generation — from pale yellow (low) to deep red (high).
		</p>
	</div>
</PageHeaderSimple>

<div class="container max-w-7xl mx-auto px-4 py-12">
	<!-- Color legend -->
	<div class="mb-6">
		<ColorLegend />
	</div>

	<!-- Hero chart -->
	<section id="hero-chart" class="mb-12">
		<div class="flex items-center gap-3 mb-3">
			<h2 class="text-xl font-light font-space">{selectedYear}</h2>
			<a
				href="/data/solar-heatmap/{selectedYear}.csv"
				download="{selectedYear}-solar-heatmap.csv"
				class="bg-black text-white p-2 rounded-lg transition-all hover:bg-dark-grey ml-auto"
				title="Download {selectedYear} data as CSV"
			>
				<IconArrowDownTray class="size-5" />
			</a>
		</div>

		<div class="relative">
			<SolarHeatmap
				data={selectedData.data}
				days={selectedData.days}
				year={selectedYear}
				showAxes={true}
				showTooltip={true}
				onhover={handleHeroHover}
				onhoverend={handleHeroHoverEnd}
			/>
			<HeatmapTooltip cell={hoveredCell} x={tooltipX} y={tooltipY} />
		</div>
	</section>
</div>

<!-- Small multiples (full-width section) -->
<section class="border-t border-b border-warm-grey py-8">
	<div class="container max-w-7xl mx-auto px-4">
		<div class="flex items-center mb-4">
			<div class="w-9 shrink-0"></div>
			<h3 class="flex-1 text-center m-0">
				Solar's share has increased since 2016
			</h3>
			<button
				class="bg-black text-white p-2 rounded-lg transition-all hover:bg-dark-grey shrink-0"
				onclick={toggleAnimation}
				title={playing ? 'Stop' : 'Play'}
			>
				{#if playing}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
						<rect x="6" y="5" width="4" height="14" rx="1" />
						<rect x="14" y="5" width="4" height="14" rx="1" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
						<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<div class="relative">
		<!-- Glass highlight in center -->
		<div
			class="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-[136px] -translate-x-1/2"
			style="background: rgba(255, 255, 255, 0.36); border-radius: 16px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); border: 1px solid rgba(255, 255, 255, 0.62);"
		></div>

		<!-- Fade edges -->
		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-white dark:from-dark-grey to-transparent"
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-white dark:from-dark-grey to-transparent"
		></div>

		<div
			class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
			bind:this={scrollContainer}
			onscrollend={handleScrollEnd}
		>
			<div class="shrink-0 w-[calc(50%-68px)]"></div>
			{#each smallMultipleYears as year (year)}
				{@const yd = data.yearData[year]}
				<div
					bind:this={thumbnailRefs[year]}
					class="shrink-0 w-[120px] snap-center rounded-lg p-2 transition-all duration-300 {year ===
					selectedYear
						? 'scale-105'
						: 'opacity-50 hover:opacity-80'}"
				>
					<div class="text-[10px] font-semibold mb-0.5 text-center">{year}</div>
					<SolarHeatmap data={yd.data} days={yd.days} {year} onclick={handleThumbnailClick} />
				</div>
			{/each}
			<div class="shrink-0 w-[calc(50%-68px)]"></div>
		</div>
	</div>
</section>

<!-- Source footnote -->
<div class="container max-w-7xl mx-auto px-4">
	<footer class="mt-12 pt-4">
		<p class="text-xs text-mid-warm-grey">
			Solar includes rooftop and utility-scale photovoltaic generation. Values represent solar's
			share of total NEM generation for each 30-minute interval.
		</p>
	</footer>
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
