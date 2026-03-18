<script>
	import { getContext } from 'svelte';
	import StratumChart from '$lib/components/charts/v2/StratumChart.svelte';
	import Tooltip from './Tooltip.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @property {number} [projectionStartTime]
	 * @property {FuelTechCode[]} [seriesLoadsIds]
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(time: number) => void} [onfocus]
	 */

	/** @type {Props} */
	let { chart, projectionStartTime, seriesLoadsIds = [], onhover, onhoverend, onfocus } = $props();

	const {
		singleSelectionModelScenarioLabel,
		singleSelectionPathway,
		selectedRegionLabel,
		isScenarioViewSection
	} = getContext('scenario-filters');
</script>

<section>
	{#if chart.seriesNames.length}
		<StratumChart
			{chart}
			overlayStart={projectionStartTime}
			{onhover}
			{onhoverend}
			{onfocus}
		>
			{#snippet header()}
				<header>
					<div class="md:flex gap-2 items-center px-10 md:px-0">
						<div class="flex gap-2 items-center">
							<h5 class="m-0 leading-none">
								{chart.title}
							</h5>

							{#if chart.chartOptions.allowPrefixSwitch}
								<button
									class="font-light text-sm text-mid-grey hover:underline"
									onclick={() => chart.chartOptions.cyclePrefix()}
								>
									{chart.chartOptions.displayUnit || ''}
								</button>
							{:else}
								<span class="font-light text-sm text-mid-grey">{chart.chartOptions.displayUnit || ''}</span>
							{/if}

							<span class="hidden md:block font-light text-sm text-mid-grey">—</span>
						</div>

						{#if $isScenarioViewSection}
							<span class="font-light text-xs md:text-sm text-mid-grey relative -top-1 md:top-0">
								{$selectedRegionLabel}
							</span>
						{:else}
							<span class="font-light text-xs md:text-sm text-mid-grey relative -top-1 md:top-0">
								{$singleSelectionModelScenarioLabel} ({$singleSelectionPathway}), {$selectedRegionLabel}
							</span>
						{/if}
					</div>
				</header>
			{/snippet}

			{#snippet tooltip()}
				<Tooltip
					hoverData={chart.hoverData}
					hoverKey={chart.hoverKey}
					seriesColours={chart.seriesColours}
					seriesLabels={chart.seriesLabels}
					convertAndFormatValue={chart.convertAndFormatValue}
					showTotal={chart.chartOptions.isAnyStackedType}
				/>
			{/snippet}
		</StratumChart>
	{/if}
</section>
