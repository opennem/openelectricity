<script>
	import { getContext } from 'svelte';

	import { regionsNemOnlyOptions as regionOptions } from '$lib/regions';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';


	import { formatFyTickX } from '$lib/utils/formatters';

	import { viewSectionOptions as _viewSectionOptions } from '../page-data-options/view-sections';

	/** @type {any[]} */
	const viewSectionOptions = _viewSectionOptions;
	import { dataTypeDisplayOptions } from '../page-data-options/data-types';
	import { modelOptions, modelScenarioPathwayOptions } from '../page-data-options/models';
	import { groupOptions as groupTechnologyOptions } from '../page-data-options/groups-technology';
	import { groupOptions as groupScenarioOptions } from '../page-data-options/groups-scenario';
	import { chartXTicks, chartXHighlightTicks, chartXMobileHiddenTicks } from '../page-data-options/chart-ticks';
	import {
		planOptions,
		getScenarioOptions,
		getPathwayOptions,
		getDefaultPathway,
		getDefaultScenario
	} from '../page-data-options/grouped-options';
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
		isSingleSelectionMode
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

		$multiSelectionData = defaultModel.scenarios
			.map((s) =>
				modelScenarioPathwayOptions.find(
					(m) => m.id === `${s.id}-${defaultModel.defaultPathway}`
				)
			)
			.filter(Boolean);

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
				const allTicks = chartXTicks[modelOptions[0].value];
				const highlightTicks = chartXHighlightTicks[modelOptions[0].value] || [];

				// Only hide projection start labels (highlight ticks after the first one);
				// keep the first highlight tick (history end, e.g. FY25)
				const projectionStartTicks = highlightTicks.slice(1);
				const hideSet = new Set(projectionStartTicks.map((/** @type {Date} */ t) => +t));

				chart.xGridlineTicks = allTicks.filter((/** @type {Date} */ t) => !hideSet.has(+t));
				chart.xTicks = allTicks.filter((/** @type {Date} */ t) => !hideSet.has(+t));
				chart.xHighlightTicks = highlightTicks;
				chart.xMobileHiddenTicks = chartXMobileHiddenTicks[modelOptions[0].value] || [];
			} else {
				chart.xGridlineTicks = undefined;
				chart.xTicks = chartXTicks[$singleSelectionData.model];
				chart.xHighlightTicks = chartXHighlightTicks[$singleSelectionData.model] || [];
				chart.xMobileHiddenTicks = chartXMobileHiddenTicks[$singleSelectionData.model] || [];
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

	// --- Plan / Scenario / Pathway inline dropdown handlers ---

	// Derived options based on current model
	let selectedModel = $derived($singleSelectionData?.model || '');
	let scenarioOptions = $derived(getScenarioOptions(selectedModel));
	let pathwayOptions = $derived(getPathwayOptions(selectedModel));


	/**
	 * Handle plan (ISP model) selection — resets scenario and pathway to defaults
	 * @param {{label: string, value: string | number | null | undefined}} option
	 */
	function handlePlanSelect(option) {
		const modelValue = /** @type {string} */ (option.value);
		const scenario = getDefaultScenario(modelValue);
		const pathway = getDefaultPathway(modelValue);

		$singleSelectionData = {
			id: `${modelValue}-${scenario}`,
			model: modelValue,
			scenario,
			pathway
		};
	}

	/**
	 * Handle single scenario selection
	 * @param {{label: string, value: string | number | null | undefined}} option
	 */
	function handleScenarioSelect(option) {
		const scenario = /** @type {string} */ (option.value);
		$singleSelectionData = {
			...$singleSelectionData,
			id: `${selectedModel}-${scenario}`,
			scenario
		};
	}

/**
	 * Handle single pathway selection
	 * @param {{label: string, value: string | number | null | undefined}} option
	 */
	function handlePathwaySelect(option) {
		$singleSelectionData = {
			...$singleSelectionData,
			pathway: /** @type {string} */ (option.value)
		};
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

		<section class="p-10 w-full flex flex-col gap-12 relative z-50">
			{#if $isSingleSelectionMode}
				<FormSelect
					formLabel="Plan"
					options={planOptions}
					selected={selectedModel}
					paddingX=""
					staticDisplay={true}
					selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
					onchange={handlePlanSelect}
				/>

				<FormSelect
					formLabel="Scenario"
					options={scenarioOptions}
					selected={$singleSelectionData?.scenario || ''}
					paddingX=""
					staticDisplay={true}
					selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
					onchange={handleScenarioSelect}
				/>

				<FormSelect
					formLabel="Pathway"
					options={pathwayOptions}
					selected={$singleSelectionData?.pathway || ''}
					paddingX=""
					staticDisplay={true}
					selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
					onchange={handlePathwaySelect}
				/>
			{/if}

			<div class="flex gap-12">
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

				<FormMultiSelect
					options={dataTypeDisplayOptions}
					selected={$selectedCharts}
					label="Charts"
					paddingX=""
					staticDisplay={true}
					selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
					onchange={(value, isMetaPressed) => handleDataTypeChange(value, isMetaPressed)}
				/>
			</div>
		</section>

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
		{#if isFullscreen}
			<button
				onclick={() => onfullscreenchange?.()}
				class="flex items-center cursor-pointer"
				title="Exit full screen"
			>
				<img src="/logo-mark.png" alt="Open Electricity" class="h-10 w-auto" />
			</button>
		{/if}

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
			{#if $isSingleSelectionMode}
				<div class="flex items-center whitespace-nowrap">
					<FormSelect
						options={planOptions}
						selected={selectedModel}
						paddingX="px-7"
						paddingY="py-3"
						onchange={handlePlanSelect}
					/>

					<FormSelect
						options={scenarioOptions}
						selected={$singleSelectionData?.scenario || ''}
						paddingX="px-7"
						paddingY="py-3"
						onchange={handleScenarioSelect}
					/>

					<FormSelect
						options={pathwayOptions}
						selected={$singleSelectionData?.pathway || ''}
						paddingX="px-7"
						paddingY="py-3"
						onchange={handlePathwaySelect}
					/>
				</div>
			{/if}

			<div class="flex items-center whitespace-nowrap {$isSingleSelectionMode ? 'border-l border-warm-grey pl-4 ml-4' : ''}">
				{#if $isTechnologyViewSection || $isScenarioViewSection}
					<FormSelect
						options={regionOptions}
						selected={$selectedRegion}
						paddingX="px-7"
						paddingY="py-3"
						onchange={(option) => ($selectedRegion = option.value)}
					/>
				{/if}

				<FormMultiSelect
					options={dataTypeDisplayOptions}
					selected={$selectedCharts}
					label="Charts"
					paddingX="px-7"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => handleDataTypeChange(value, isMetaPressed)}
				/>
			</div>
		</div>
	</div>

	<div class="flex items-center border-l border-warm-grey pl-4 ml-4">
		<OptionsMenu {isFullscreen} onfullscreenchange={() => onfullscreenchange?.()} onshowshortcuts={() => onshowshortcuts?.()} />
	</div>
</div>
