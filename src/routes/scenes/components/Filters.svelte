<script>
	import { getContext } from 'svelte';
	import { startOfYear } from 'date-fns';

	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';

	import { viewSectionOptions } from '../page-data-options/view-sections';
	import { dataTypeOptions } from '../page-data-options/data-types';
	import { regionOptions } from '../page-data-options/regions';
	import { scenarioLabels } from '../page-data-options/descriptions';
	import { modelOptions } from '../page-data-options/models';
	import { groupOptions } from '../page-data-options/groups';
	import { chartXTicks } from '../page-data-options/chart-ticks';
	import { formatFyTickX } from '../page-data-options/formatters';
	import ScenarioSelection from './ScenarioSelection.svelte';

	const {
		singleSelectionData,
		multiSelectionData,
		singleSelectionModel,
		singleSelectionScenario,
		selectedViewSection,
		selectedDataType,
		selectedRegion,
		selectedFuelTechGroup,
		isTechnologyViewSection,
		isScenarioViewSection,
		isSingleSelectionMode
	} = getContext('scenario-filters');

	const dataVizStores = [
		getContext('energy-data-viz'),
		getContext('emissions-data-viz'),
		getContext('capacity-data-viz'),
		getContext('intensity-data-viz')
	];

	let showScenarioOptions = false;

	init();

	function init() {
		$selectedViewSection = 'technology';

		const defaultModel = modelOptions[0];

		// default to the first model and scenario
		$singleSelectionData = {
			id: defaultModel.scenarios[0].id,
			model: defaultModel.value,
			scenario: defaultModel.scenarios[0].value,
			pathway: defaultModel.defaultPathway
		};

		// default to the first model and all its scenarios
		$multiSelectionData = defaultModel.scenarios.map((s) => ({
			id: s.id,
			model: defaultModel.value,
			scenario: s.value,
			pathway: defaultModel.defaultPathway
		}));

		$selectedDataType = 'energy';
		$selectedRegion = '_all';
		$selectedFuelTechGroup = 'simple';

		dataVizStores.forEach((store) => {
			store.formatTickX.set(formatFyTickX);
		});
	}

	/**
	 * @param {string} start
	 * @param {string} end
	 */
	function updateChartOverlayDates(start, end) {
		const overlayDates = {
			xStartValue: startOfYear(new Date(start)),
			xEndValue: startOfYear(new Date(end))
		};
		const overlayLineDate = { date: startOfYear(new Date(start)) };

		dataVizStores.forEach((store) => {
			store.chartOverlay.set(overlayDates);
			store.chartOverlayLine.set(overlayLineDate);
		});
	}

	$: {
		// TODO: if singleselection model changes, update xTicks, otherwise use default xTicks
		dataVizStores.forEach((store) => {
			store.xTicks.set(chartXTicks[$singleSelectionData.model]);
		});
	}
	$: if (
		$isScenarioViewSection ||
		($isSingleSelectionMode && $singleSelectionModel === 'aemo2024')
	) {
		updateChartOverlayDates('2024-01-01', '2052-01-01');
	} else {
		updateChartOverlayDates('2023-01-01', '2051-01-01');
	}

	/**
	 * @param {ScenarioViewSection} prevView
	 * @param {ScenarioViewSection} view
	 */
	function handleDisplayViewChange(prevView, view) {
		console.log('prevView', prevView, 'view', view);
		$selectedViewSection = view;
	}
</script>

<div class="max-w-none flex gap-16 justify-between px-6 py-6">
	<a id="filters" class="hidden">Filters</a>
	<div class="flex gap-16 divide-x divide-warm-grey">
		<Switch
			buttons={viewSectionOptions}
			selected={$selectedViewSection}
			on:change={(evt) => handleDisplayViewChange($selectedViewSection, evt.detail.value)}
			class="justify-center my-4"
		/>

		<div class="py-2 flex items-center gap-6 pl-10 relative z-40">
			<!-- <FormSelect
				options={dataTypeOptions}
				selected={$selectedDataType}
				on:change={(evt) => ($selectedDataType = evt.detail.value)}
			/> -->

			{#if $isTechnologyViewSection || $isScenarioViewSection}
				<FormSelect
					options={regionOptions}
					selected={$selectedRegion}
					on:change={(evt) => ($selectedRegion = evt.detail.value)}
				/>
			{/if}

			<FormSelect
				options={groupOptions}
				selected={$selectedFuelTechGroup}
				on:change={(evt) => ($selectedFuelTechGroup = evt.detail.value)}
			/>

			{#if $singleSelectionModel && $singleSelectionScenario}
				<button
					class="text-sm flex items-center gap-3 justify-center px-8 py-4 border rounded-xl whitespace-nowrap bg-white text-dark-grey"
					class:border-dark-grey={showScenarioOptions}
					class:border-mid-warm-grey={!showScenarioOptions}
					on:click={() => (showScenarioOptions = !showScenarioOptions)}
				>
					{#if $isScenarioViewSection}
						Update Scenarios
					{:else}
						{scenarioLabels[$singleSelectionModel][$singleSelectionScenario]}
					{/if}

					{#if showScenarioOptions}
						<IconMinus />
					{:else}
						<IconPlus />
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>

{#if $selectedViewSection}
	<div
		class="transition-all relative"
		class:z-20={showScenarioOptions}
		class:z-0={!showScenarioOptions}
		class:opacity-100={showScenarioOptions}
		class:h-auto={showScenarioOptions}
		class:opacity-0={!showScenarioOptions}
		class:h-0={!showScenarioOptions}
	>
		<ScenarioSelection />
	</div>
{/if}
