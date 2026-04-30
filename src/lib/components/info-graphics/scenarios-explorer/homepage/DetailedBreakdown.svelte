<script>
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { withScenarioLabels } from '../../../../../routes/(main)/scenarios/page-data-options/models';

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @property {string} selectedGroup
	 * @property {string[]} [seriesLoadsIds]
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 */

	/** @type {Props} */
	let {
		chart,
		selectedGroup,
		seriesLoadsIds = [],
		onhover,
		onhoverend
	} = $props();

	let gridColClass = $derived(
		selectedGroup === 'homepage_preview'
			? 'grid-cols-2 md:grid-cols-6'
			: 'grid-cols-2'
	);

	// Normalise overlay to number for MiniCharts
	let overlayStartValue = $derived.by(() => {
		const overlay = chart.chartStyles.chartOverlayLine;
		if (!overlay) return undefined;
		return /** @type {number} */ (+new Date(/** @type {any} */ (overlay).date));
	});

	let bgShadingData = $derived(chart.bgShadingData);
	let bgShadingFill = $derived(chart.bgShadingFill);
</script>

{#if chart.seriesData.length > 0}
	<div class="border-t border-b md:border-x border-mid-warm-grey">
		<MiniCharts
			seriesNames={chart.seriesNames}
			seriesLabels={withScenarioLabels(chart.seriesLabels)}
			seriesColours={chart.seriesColours}
			seriesData={chart.seriesData}
			{seriesLoadsIds}
			displayUnit={chart.chartOptions.displayUnit}
			xTicks={chart.xTicks}
			formatTickX={chart.formatTickX}
			formatTickY={chart.convertAndFormatValue}
			overlayStart={overlayStartValue}
			shadingData={bgShadingData}
			shadingFill={bgShadingFill}
			hoverTime={chart.hoverTime}
			focusTime={chart.focusTime}
			{gridColClass}
			gridGapClass="gap-0"
			sectionBorderClass="p-8 border-r border-mid-warm-grey md:last:border-r-0 [&:nth-child(-n+4)]:border-b md:[&:nth-child(-n+4)]:border-b-0"
			showIcon={true}
			{onhover}
			{onhoverend}
		/>
	</div>
{:else}
	<div class="border-t border-b md:border-x border-mid-warm-grey grid {gridColClass} gap-0">
		{#each { length: 6 } as _, i (i)}
			<div class="p-8 border-r border-mid-warm-grey animate-pulse">
				<div class="h-4 w-2/3 bg-warm-grey rounded mb-4"></div>
				<div class="h-8 w-1/3 bg-warm-grey rounded mb-6"></div>
				<div class="h-[150px] bg-warm-grey rounded"></div>
			</div>
		{/each}
	</div>
{/if}
