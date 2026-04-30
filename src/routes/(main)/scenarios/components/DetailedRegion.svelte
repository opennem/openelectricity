<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import ScenarioDescription from './ScenarioDescription.svelte';
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { withScenarioLabels } from '../page-data-options/models';

	/**
	 * @typedef {Object} Props
	 * @property {(data: any) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(data: any) => void} [onfocus]
	 */

	/** @type {Props} */
	let { onhover, onhoverend, onfocus } = $props();

	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');
	const { singleSelectionModel } = getContext('scenario-filters');

	/** @type {Record<string, any>} */
	const chartStores = {
		generation,
		emissions,
		capacity
	};

	let selectedChartName = $state('generation');

	const stores = [
		{ value: 'generation', label: 'Generation' },
		{ value: 'emissions', label: 'Emissions' },
		{ value: 'capacity', label: 'Capacity' }
	];

	let isEmissionsView = $derived(selectedChartName === 'emissions');

	let selectedChart = $derived(chartStores[selectedChartName]);
	let seriesNames = $derived(selectedChart.seriesNames);
	let seriesLabels = $derived(withScenarioLabels(selectedChart.seriesLabels));
	let seriesColours = $derived(selectedChart.seriesColours);
	let xTicks = $derived(selectedChart.xTicks);
	let formatTickX = $derived(selectedChart.formatTickX);
	let formatTickY = $derived(selectedChart.convertAndFormatValue);
	let hoverTime = $derived(selectedChart.hoverTime);
	let focusTime = $derived(selectedChart.focusTime);
	let overlayStart = $derived(selectedChart.chartStyles.chartOverlayLine);
	let seriesData = $derived(selectedChart.seriesData);
	let displayUnit = $derived(selectedChart.chartOptions.displayUnit);

	let intensityFormatTickY = $derived(intensity.convertAndFormatValue);
	let intensitySeriesLabels = $derived(withScenarioLabels(intensity.seriesLabels));
	let intensitySeriesColours = $derived(intensity.seriesColours);
	let intensitySeriesData = $derived(intensity.seriesData);
	let intensityDisplayUnit = $derived(intensity.chartOptions.displayUnit);

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
				selected={selectedChartName}
				onchange={(detail) => (selectedChartName = detail.value)}
				class="justify-center"
			/>
		</div>

		{#if isEmissionsView}
			<div class="grid grid-cols-2 gap-3">
				<MiniCharts
					seriesNames={[...seriesNames].reverse()}
					{seriesLabels}
					{seriesColours}
					{xTicks}
					{formatTickX}
					{formatTickY}
					{overlayStart}
					{hoverTime}
					{focusTime}
					{seriesData}
					{displayUnit}
					gridColClass="grid-cols-1"
					{onhover}
					{onhoverend}
					{onfocus}
				/>
				<MiniCharts
					seriesNames={[...seriesNames].reverse()}
					seriesLabels={intensitySeriesLabels}
					seriesColours={intensitySeriesColours}
					{xTicks}
					{formatTickX}
					formatTickY={intensityFormatTickY}
					{overlayStart}
					{hoverTime}
					{focusTime}
					seriesData={intensitySeriesData}
					displayUnit={intensityDisplayUnit}
					showArea={false}
					gridColClass="grid-cols-1"
					{onhover}
					{onhoverend}
					{onfocus}
				/>
			</div>
		{:else}
			<MiniCharts
				seriesNames={[...seriesNames].reverse()}
				{seriesLabels}
				{seriesColours}
				{xTicks}
				{formatTickX}
				{formatTickY}
				{overlayStart}
				{hoverTime}
				{focusTime}
				{seriesData}
				{displayUnit}
				{onhover}
				{onhoverend}
				{onfocus}
			/>
		{/if}
	</section>
</div>
