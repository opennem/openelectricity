<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import { modelLabelMap, scenarioLabelMap } from '../page-data-options/models';

	import MiniCharts from './MiniCharts.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {(data: any) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(data: any) => void} [onfocus]
	 */

	/** @type {Props} */
	let { onhover, onhoverend, onfocus } = $props();

	const { multiSelectionData } = getContext('scenario-filters');
	const { orderedModelScenarioPathways, isScenarioViewSection } = getContext('by-scenario');
	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');

	/** @type {Object.<string, *>} */
	const chartStores = {
		generation,
		emissions,
		capacity
	};

	const stores = [
		{ value: 'generation', label: 'Generation' },
		{ value: 'emissions', label: 'Emissions' },
		{ value: 'capacity', label: 'Capacity' }
	];

	let selectedStoreName = $state('generation');
	let selectedScenarioId = $state('');
	let selectedScenarioPathwayId = $state('');

	let isSelectedScenarioIdEmpty = $derived(selectedScenarioId === '');

	$effect(() => {
		if (isSelectedScenarioIdEmpty) {
			selectedScenarioId = $multiSelectionData[0].model + '-' + $multiSelectionData[0].scenario;
			selectedScenarioPathwayId = $multiSelectionData[0].id;
		}
	});

	let isEmissionsView = $derived(selectedStoreName === 'emissions');

	let selectedStore = $derived(chartStores[selectedStoreName]);
	let seriesNames = $derived(selectedStore.seriesNames);
	let seriesColours = $derived(selectedStore.seriesColours);
	let xTicks = $derived(selectedStore.xTicks);
	let formatTickX = $derived(selectedStore.formatTickX);
	let formatTickY = $derived(selectedStore.convertAndFormatValue);
	/**
	 * Find the projection start time for a model's scenarios from the raw series data.
	 * In keepFullHistory mode, projection series are null for history rows, so the
	 * first non-null value marks the projection start.
	 * @param {string[]} names - scenario series names for the model
	 * @returns {number | undefined}
	 */
	function getModelProjectionStart(names) {
		for (const d of seriesData) {
			if (names.some((name) => d[name] != null)) {
				return /** @type {number} */ (d.time);
			}
		}
		return undefined;
	}
	let hoverTime = $derived(selectedStore.hoverTime);
	let focusTime = $derived(selectedStore.focusTime);
	let seriesData = $derived(selectedStore.seriesData);
	let displayUnit = $derived(selectedStore.chartOptions.displayUnit);

	let intensitySeriesNames = $derived(intensity.seriesNames);
	let intensityFormatTickY = $derived(intensity.convertAndFormatValue);
	let intensitySeriesColours = $derived(intensity.seriesColours);
	let intensitySeriesData = $derived(intensity.seriesData);
	let intensityDisplayUnit = $derived(intensity.chartOptions.displayUnit);

	let seriesPathways = $derived(
		$multiSelectionData.reduce((/** @type {any} */ acc, /** @type {any} */ d) => {
			acc[d.id] = d.pathway;
			return acc;
		}, {})
	);

	let seriesNamesWithoutHistorical = $derived(
		seriesNames.filter((/** @type {string} */ name) => name !== 'historical')
	);
	/** @type {TimeSeriesData[]} */
	let mergedSeriesData = $derived.by(() => {
		return seriesData.map((/** @type {TimeSeriesData} */ d) => {
			const obj = {
				...d
			};

			seriesNamesWithoutHistorical.forEach((/** @type {string} */ name) => {
				const value = /** @type {number} */ (d[name]);
				if (!value) {
					obj[name] = d['historical'];
				}
			});

			return obj;
		});
	});

	let intensitySeriesNamesWithoutHistorical = $derived(
		intensitySeriesNames.filter((/** @type {string} */ name) => name !== 'historical')
	);
	/** @type {TimeSeriesData[]} */
	let mergedIntensityData = $derived.by(() => {
		return intensitySeriesData.map((/** @type {TimeSeriesData} */ d) => {
			const obj = {
				...d
			};

			intensitySeriesNamesWithoutHistorical.forEach((/** @type {string} */ name) => {
				if (!d[name]) {
					obj[name] = d['historical'];
				}
			});

			return obj;
		});
	});

	/**
	 * @param {{ key: string }} detail
	 */
	function handleScenarioSelect(detail) {
		// key includes pathway, remove before assigning
		const keyArr = detail.key.split('-');
		selectedScenarioId = keyArr[0] + '-' + keyArr[1];
		selectedScenarioPathwayId = detail.key;
	}

	/**
	 * @param {string} model
	 * @param {*[]} scenarios
	 */
	function getNames(model, scenarios) {
		/** @type {string[]} */
		const names = [];
		scenarios.forEach((/** @type {any} */ d) => {
			d.pathways.forEach((/** @type {any} */ e) => {
				names.push(`${model}-${d.scenario}-${e}`);
			});
		});
		return names.reverse();
	}

	/**
	 * @param {string} model
	 * @param {*[]} scenarios
	 */
	function getLabels(model, scenarios) {
		/** @type {Object.<string, string>} */
		const labels = {};

		scenarios.forEach((/** @type {any} */ d) => {
			d.pathways.forEach((/** @type {any} */ e) => {
				labels[`${model}-${d.scenario}-${e}`] = scenarioLabelMap[`${model}-${d.scenario}`];
			});
		});

		return labels;
	}
</script>

<div class="container max-w-none lg:container md:w-1/2 px-0 md:px-16 lg:px-40">
	<section class="px-5 md:px-0">
		<div class="flex justify-center mb-12">
			<Switch
				buttons={stores}
				selected={selectedStoreName}
				onchange={(detail) => (selectedStoreName = detail.value)}
				class="justify-center"
			/>
		</div>

		{#each $orderedModelScenarioPathways as { model, scenarios } (model)}
			{@const names = getNames(model, scenarios)}
			{@const labels = getLabels(model, scenarios)}
			<section class="mb-12">
				<h6 class="font-space text-mid-grey pl-5 md:pl-0">{modelLabelMap[model]}</h6>
				{#if isEmissionsView}
					<div class="grid grid-cols-2 gap-3">
						<MiniCharts
							isButton={true}
							selected={selectedScenarioPathwayId}
							seriesNames={names}
							seriesLabels={labels}
							{seriesColours}
							{seriesPathways}
							{xTicks}
							{formatTickX}
							{formatTickY}
							{hoverTime}
							{focusTime}
							overlayStart={getModelProjectionStart(names)}
							seriesData={mergedSeriesData}
							{displayUnit}
							gridColClass="grid-cols-1"
							{onhover}
							{onhoverend}
							{onfocus}
							onscenarioclick={handleScenarioSelect}
						/>
						<MiniCharts
							isButton={true}
							selected={selectedScenarioPathwayId}
							seriesNames={names}
							seriesLabels={labels}
							seriesColours={intensitySeriesColours}
							{seriesPathways}
							{xTicks}
							{formatTickX}
							formatTickY={intensityFormatTickY}
							{hoverTime}
							{focusTime}
							overlayStart={getModelProjectionStart(names)}
							seriesData={mergedIntensityData}
							displayUnit={intensityDisplayUnit}
							showArea={false}
							gridColClass="grid-cols-1"
							{onhover}
							{onhoverend}
							{onfocus}
							onscenarioclick={handleScenarioSelect}
						/>
					</div>
				{:else}
					<MiniCharts
						isButton={true}
						selected={selectedScenarioPathwayId}
						seriesNames={names}
						seriesLabels={labels}
						{seriesColours}
						{seriesPathways}
						{xTicks}
						{formatTickX}
						{formatTickY}
						{hoverTime}
						{focusTime}
						overlayStart={getModelProjectionStart(names)}
						seriesData={mergedSeriesData}
						{displayUnit}
						{onhover}
						{onhoverend}
						{onfocus}
						onscenarioclick={handleScenarioSelect}
					/>
				{/if}
			</section>
		{/each}
	</section>
</div>
