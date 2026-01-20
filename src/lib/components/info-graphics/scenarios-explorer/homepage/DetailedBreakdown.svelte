<script>
	import { run } from 'svelte/legacy';

	import { getContext, createEventDispatcher } from 'svelte';
	import { startOfYear } from 'date-fns';

	import { fuelTechNameReducer, fuelTechReducer } from '$lib/fuel_techs.js';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import SparkLineArea from '$lib/components/info-graphics/integrated-system-plan/SparkLineArea.svelte';
	import {
		scenarioLabels,
		scenarioParagraphs,
		scenarioSummary,
		scenarioKeyPoints
	} from '../descriptions';

	import { dataViewUnits } from '../options';
	import { homepageDataTechnologyGroupOptions } from '../helpers';

	const {
		selectedModel,
		selectedScenario,
		selectedDisplayView,
		selectedDataView,
		isTechnologyDisplay,
		isScenarioDisplay
	} = getContext('scenario-filters');

	const { selectedGroup, showPercentage, projectionStats } = getContext('scenario-data');

	const { cachedDisplayData } = getContext('scenario-cache');

	const dispatchEvent = createEventDispatcher();

	run(() => {
		console.log('cachedDisplayData', $cachedDisplayData[$selectedDisplayView]);
	});

	let displayUnit = $derived(
		$isTechnologyDisplay
			? dataViewUnits[$selectedDataView]
			: $showPercentage
				? '% of demand'
				: dataViewUnits[$selectedDataView]
	);
	let displayData = $derived($cachedDisplayData[$selectedDisplayView]);
	let loadIds = $derived(displayData ? displayData.loadIds || [] : []);
	let displayDataNames = $derived(
		displayData ? displayData.names.filter((d) => d !== 'historical') || [] : []
	);
	let displayDatasets = $derived(displayData ? displayData.data || [] : []);

	let overlay = $derived(
		$isScenarioDisplay
			? {
					xStartValue: startOfYear(new Date('2024-01-01')),
					xEndValue: startOfYear(new Date('2052-01-01'))
				}
			: $selectedModel === 'aemo2024'
				? {
						xStartValue: startOfYear(new Date('2024-01-01')),
						xEndValue: startOfYear(new Date('2052-01-01'))
					}
				: {
						xStartValue: startOfYear(new Date('2023-01-01')),
						xEndValue: startOfYear(new Date('2051-01-01'))
					}
	);
	let overlayLine = $derived(
		$selectedModel === 'aemo2024' && !$isScenarioDisplay
			? { date: startOfYear(new Date('2024-01-01')) }
			: { date: startOfYear(new Date('2023-01-01')) }
	);

	let names = $derived($isTechnologyDisplay ? [...displayDataNames].reverse() : displayDataNames);
	let dataset = $derived(
		displayDatasets.map((d) => {
			const obj = {
				...d
			};

			// Invert load values back to positive
			loadIds.forEach((id) => {
				obj[id] = -d[id];
			});

			// Fill in any missing data so area chart renders properly
			displayDataNames.forEach((name) => {
				if (!obj[name]) {
					if ($isScenarioDisplay && name !== 'historical') {
						// if it is a scenario display, fill in the historical data
						obj[name] = obj.historical || 0;
					} else {
						obj[name] = 0;
					}
				}
			});

			return obj;
		})
	);

	let xTicks = $derived(
		$selectedModel === 'aemo2024' || $isScenarioDisplay
			? [2010, 2024, 2040, 2052].map((year) => startOfYear(new Date(`${year}-01-01`)))
			: [2010, 2023, 2040, 2051].map((year) => startOfYear(new Date(`${year}-01-01`)))
	);

	/**
	 * @typedef {Object} Props
	 * @property {any} [hoverData]
	 */

	/** @type {Props} */
	let { hoverData = null } = $props();

	let projectionFuelTechIds = $derived($projectionStats.data.reduce(fuelTechReducer, {}));

	function handleMousemove(key, data) {
		dispatchEvent('mousemove', { key, data: data });
	}
</script>

<div class="flex items-center gap-1 mb-6 px-6 lg:px-0">
	View:
	<div class="rounded-md whitespace-nowrap">
		<FormSelect
			options={homepageDataTechnologyGroupOptions}
			selected={$selectedGroup}
			on:change={(evt) => ($selectedGroup = evt.detail.value)}
		/>
	</div>
</div>

<div
	class="grid grid-cols-2 md:grid-cols-6 grid-flow-dense md:divide-x divide-mid-warm-grey border-t border-b md:border-x border-mid-warm-grey"
	class:md:grid-cols-6={names.length === 6}
	class:md:grid-cols-2={names.length === 2}
>
	{#each names as key, i (key)}
		<SparkLineArea
			class="p-8 even:border-l border-t nth-[-n+2]:border-t-0 md:border-0 border-mid-warm-grey"
			id={`key-${i}`}
			{overlay}
			{overlayLine}
			{dataset}
			{key}
			{xTicks}
			title={displayData.labels[key]}
			colour={displayData.colours[key]}
			{hoverData}
			{displayUnit}
			fuelTechId={projectionFuelTechIds[key]}
			showIcon={true}
			isTechnologyDisplay={$isTechnologyDisplay}
			on:mousemove={(e) => handleMousemove(key, e.detail)}
			on:mouseout
		/>
	{/each}
</div>
