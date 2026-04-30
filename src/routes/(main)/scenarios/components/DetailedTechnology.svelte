<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import ScenarioDescription from './ScenarioDescription.svelte';
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { withScenarioLabels } from '../page-data-options/models';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} [seriesLoadsIds]
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(time: number) => void} [onfocus]
	 */

	/** @type {Props} */
	let { seriesLoadsIds = [], onhover, onhoverend, onfocus } = $props();

	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');
	const { singleSelectionModel } = getContext('scenario-filters');

	/** @type {Record<string, import('$lib/components/charts/v2/ChartStore.svelte.js').default>} */
	const chartMap = {
		generation,
		emissions,
		capacity
	};

	let selectedChartKey = $state('generation');

	const stores = [
		{ value: 'generation', label: 'Generation' },
		{ value: 'emissions', label: 'Emissions' },
		{ value: 'capacity', label: 'Capacity' }
	];

	let isEmissionsView = $derived(selectedChartKey === 'emissions');

	let selectedChart = $derived(chartMap[selectedChartKey]);

	let isAemo2024 = $derived($singleSelectionModel === 'aemo2024');
</script>

<div
	class="container max-w-none lg:container md:w-1/2 md:grid px-0 md:px-16 lg:px-40"
	class:grid-cols-2={isAemo2024}
	class:md:w-full={isAemo2024}
>
	<div class="px-10 md:px-0">
		<ScenarioDescription showDescription={isAemo2024} />
	</div>

	<section>
		<div class="flex justify-center mb-12">
			<Switch
				buttons={stores}
				selected={selectedChartKey}
				onchange={(detail) => (selectedChartKey = detail.value)}
				class="justify-center"
			/>
		</div>

		{#if isEmissionsView}
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				<MiniCharts
					seriesNames={selectedChart.seriesNames}
					seriesLabels={withScenarioLabels(selectedChart.seriesLabels)}
					seriesColours={selectedChart.seriesColours}
					xTicks={selectedChart.xTicks}
					formatTickX={selectedChart.formatTickX}
					formatTickY={selectedChart.convertAndFormatValue}
					overlayStart={selectedChart.chartStyles.chartOverlayLine}
					hoverTime={selectedChart.hoverTime}
					focusTime={selectedChart.focusTime}
					seriesData={selectedChart.seriesData}
					displayUnit={selectedChart.chartOptions.displayUnit}
					{seriesLoadsIds}
					gridColClass="grid-cols-1"
					{onhover}
					{onhoverend}
					{onfocus}
				/>
				<MiniCharts
					seriesNames={intensity.seriesNames}
					seriesLabels={withScenarioLabels(intensity.seriesLabels)}
					seriesColours={intensity.seriesColours}
					xTicks={selectedChart.xTicks}
					formatTickX={selectedChart.formatTickX}
					formatTickY={intensity.convertAndFormatValue}
					overlayStart={selectedChart.chartStyles.chartOverlayLine}
					hoverTime={intensity.hoverTime}
					focusTime={intensity.focusTime}
					seriesData={intensity.seriesData}
					displayUnit={intensity.chartOptions.displayUnit}
					showArea={false}
					{seriesLoadsIds}
					gridColClass="grid-cols-1"
					{onhover}
					{onhoverend}
					{onfocus}
				/>
			</div>
		{:else}
			<MiniCharts
				seriesNames={selectedChart.seriesNames}
				seriesLabels={withScenarioLabels(selectedChart.seriesLabels)}
				seriesColours={selectedChart.seriesColours}
				xTicks={selectedChart.xTicks}
				formatTickX={selectedChart.formatTickX}
				formatTickY={selectedChart.convertAndFormatValue}
				overlayStart={selectedChart.chartStyles.chartOverlayLine}
				hoverTime={selectedChart.hoverTime}
				focusTime={selectedChart.focusTime}
				seriesData={selectedChart.seriesData}
				displayUnit={selectedChart.chartOptions.displayUnit}
				{seriesLoadsIds}
				{onhover}
				{onhoverend}
				{onfocus}
			/>
		{/if}
	</section>
</div>
