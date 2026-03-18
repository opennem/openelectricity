<script>
	import { getContext } from 'svelte';

	import { regionsNemOnlyOptions as regionOptions } from '$lib/regions';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';

	import { formatFyTickX } from '$lib/utils/formatters';

	import { viewSectionOptions as _viewSectionOptions } from '../page-data-options/view-sections';

	/** @type {any[]} */
	const viewSectionOptions = _viewSectionOptions;
	import { dataTypeDisplayOptions } from '../page-data-options/data-types';
	import { scenarioLabels } from '../page-data-options/descriptions';
	import { modelOptions, modelScenarioPathwayOptions } from '../page-data-options/models';
	import { groupOptions as groupTechnologyOptions } from '../page-data-options/groups-technology';
	import { groupOptions as groupScenarioOptions } from '../page-data-options/groups-scenario';
	import { chartXTicks, chartXHighlightTicks } from '../page-data-options/chart-ticks';
	import ScenarioSelection from './ScenarioSelection.svelte';
	import OptionsMenu from './OptionsMenu.svelte';

	/**
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void
	 * }}
	 */
	let { isFullscreen = false, onfullscreenchange, onshowshortcuts } = $props();

	const {
		singleSelectionData,
		multiSelectionData,
		singleSelectionModel,
		singleSelectionScenario,
		selectedViewSection,
		selectedDataType,
		selectedCharts,
		selectedRegion,
		selectedFuelTechGroup,
		isTechnologyViewSection,
		isScenarioViewSection,
		isSingleSelectionMode,
		showScenarioOptions
	} = getContext('scenario-filters');

	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');
	const chartsList = [generation, emissions, intensity, capacity];

	let showMobileFilterOptions = $state(false);

	init();

	function init() {
		$selectedViewSection = 'technology';
		$selectedCharts = ['generation', 'emissions', 'intensity', 'capacity'];

		const defaultModel = modelOptions[0];

		$singleSelectionData = {
			id: defaultModel.scenarios[0].id,
			model: defaultModel.value,
			scenario: defaultModel.scenarios[0].value,
			pathway: defaultModel.defaultPathway
		};

		$multiSelectionData = defaultModel.scenarios.map((s) =>
			modelScenarioPathwayOptions.find((m) => m.id === `${s.id}-${defaultModel.defaultPathway}`)
		);

		$selectedDataType = 'energy';
		$selectedRegion = '_all';

		if ($isTechnologyViewSection) {
			$selectedFuelTechGroup = groupTechnologyOptions[0].value;
		} else {
			$selectedFuelTechGroup = groupScenarioOptions[0].value;
		}

		chartsList.forEach((chart) => {
			chart.formatTickX = formatFyTickX;
		});
	}

	$effect(() => {
		chartsList.forEach((chart) => {
			if ($isScenarioViewSection) {
				chart.xTicks = chartXTicks['aemo2024'];
				chart.xHighlightTicks = chartXHighlightTicks['aemo2024'];
			} else {
				chart.xTicks = chartXTicks[$singleSelectionData.model];
				chart.xHighlightTicks = chartXHighlightTicks[$singleSelectionData.model] || [];
			}
		});
	});

	/**
	 * When switching views, reset the data stores and fuel tech group
	 * @param {ScenarioViewSection} prevView
	 * @param {ScenarioViewSection} view
	 */
	function handleDisplayViewChange(prevView, view) {
		if (prevView === view) return;

		$selectedViewSection = view;

		if (view === 'technology') {
			$selectedFuelTechGroup = groupTechnologyOptions[0].value;
		} else {
			$selectedFuelTechGroup = groupScenarioOptions[0].value;
		}

		chartsList.forEach((chart) => {
			chart.seriesData = [];
			chart.seriesNames = [];
			chart.seriesColours = {};
			chart.seriesLabels = {};
			chart.setYDomain(undefined);
		});
	}

	/**
	 * @param {string} dataType
	 * @param {boolean} isMetaPressed
	 */
	function handleDataTypeChange(dataType, isMetaPressed) {
		if (isMetaPressed) {
			$selectedCharts = [dataType];
		} else if ($selectedCharts.includes(dataType)) {
			$selectedCharts = $selectedCharts.filter((/** @type {string} */ d) => d !== dataType);
		} else {
			$selectedCharts = [...$selectedCharts, dataType];
		}
	}
</script>

{#if showMobileFilterOptions}
	<Modal
		maxWidthClass=""
		class="fixed! bg-white top-0 bottom-0 left-0 right-0 overflow-y-auto overscroll-contain rounded-none! my-0! pt-0 px-0 z-50"
	>
		<header
			class="sticky top-0 z-50 bg-white pb-2 pt-6 px-10 flex justify-between items-center border-b border-warm-grey"
		>
			<h3 class="mb-2">Filters</h3>

			<div class="mb-2">
				<IconAdjustmentsHorizontal class="size-10" />
			</div>
		</header>

		<section class="p-10 w-full flex gap-12 relative z-50">
			<FormMultiSelect
				options={dataTypeDisplayOptions}
				selected={$selectedCharts}
				label="Charts"
				paddingX=""
				staticDisplay={true}
				selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
				onchange={(value, isMetaPressed) => handleDataTypeChange(value, isMetaPressed)}
			/>

			{#if $isTechnologyViewSection || $isScenarioViewSection}
				<FormSelect
					formLabel="Region"
					options={regionOptions}
					selected={$selectedRegion}
					paddingX=""
					staticDisplay={true}
					selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
					onchange={(option) => ($selectedRegion = option.value)}
				/>
			{/if}
		</section>

		<ScenarioSelection mobileView={true} />

		{#snippet buttons()}
			<div class="flex gap-3 text-base">
				<Button
					class="bg-dark-grey! text-white hover:bg-black! w-full"
					onclick={() => (showMobileFilterOptions = false)}>Close</Button
				>
			</div>
		{/snippet}
	</Modal>
{/if}

<div
	class="max-w-none flex gap-4 md:gap-8 justify-between px-8 pt-3 pb-3 border-b border-warm-grey"
>
	<div class="w-full flex items-center justify-between md:justify-start gap-4">
		<div class="sm:hidden">
			<FormSelect
				options={viewSectionOptions}
				selected={$selectedViewSection}
				paddingX="px-4"
				paddingY="py-3"
				onchange={(option) => handleDisplayViewChange($selectedViewSection, /** @type {ScenarioViewSection} */ (option.value))}
			/>
		</div>

		<div class="hidden sm:block">
			<Switch
				buttons={/** @type {any} */ (viewSectionOptions)}
				selected={$selectedViewSection}
				onchange={(option) => handleDisplayViewChange($selectedViewSection, /** @type {ScenarioViewSection} */ (option.value))}
				class="justify-center"
			/>
		</div>

		<div class="md:hidden pl-4 ml-2 border-l border-warm-grey">
			<ButtonIcon onclick={() => (showMobileFilterOptions = true)}>
				<IconAdjustmentsHorizontal class="size-10" />
			</ButtonIcon>
		</div>

		<div
			class="hidden md:flex items-center gap-2 ml-4 pl-4 relative z-40 border-l border-warm-grey"
		>
			<div class="flex items-center whitespace-nowrap">
				<FormMultiSelect
					options={dataTypeDisplayOptions}
					selected={$selectedCharts}
					label="Charts"
					paddingX="px-7"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => handleDataTypeChange(value, isMetaPressed)}
				/>

				{#if $isTechnologyViewSection || $isScenarioViewSection}
					<FormSelect
						options={regionOptions}
						selected={$selectedRegion}
						paddingX="px-7"
						paddingY="py-3"
						onchange={(option) => ($selectedRegion = option.value)}
					/>
				{/if}
			</div>

			{#if $singleSelectionModel && $singleSelectionScenario}
				<button
					class="text-sm flex items-center gap-2 justify-center px-6 py-3 border rounded-xl whitespace-nowrap bg-white text-dark-grey"
					class:border-dark-grey={$showScenarioOptions}
					class:border-mid-warm-grey={!$showScenarioOptions}
					onclick={() => ($showScenarioOptions = !$showScenarioOptions)}
				>
					{#if $isScenarioViewSection}
						Update Scenarios
					{:else}
						{scenarioLabels[$singleSelectionModel][$singleSelectionScenario]}
					{/if}

					{#if $showScenarioOptions}
						<IconMinus />
					{:else}
						<IconPlus />
					{/if}
				</button>
			{/if}
		</div>
	</div>

	<div class="flex items-center border-l border-warm-grey pl-4 ml-4">
		<OptionsMenu {isFullscreen} onfullscreenchange={() => onfullscreenchange?.()} onshowshortcuts={() => onshowshortcuts?.()} />
	</div>
</div>

{#if $selectedViewSection}
	<div
		class="transition-all relative"
		class:z-20={$showScenarioOptions}
		class:z-0={!$showScenarioOptions}
		class:opacity-100={$showScenarioOptions}
		class:h-auto={$showScenarioOptions}
		class:opacity-0={!$showScenarioOptions}
		class:h-0={!$showScenarioOptions}
	>
		<ScenarioSelection />
	</div>
{/if}
