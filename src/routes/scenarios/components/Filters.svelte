<script>
	import { getContext } from 'svelte';
	import { startOfYear } from 'date-fns';

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
	import IconShare from '$lib/icons/Share.svelte';
	import IconClipboardDocumentCheck from '$lib/icons/ClipboardDocumentCheck.svelte';

	// import IconXMark from '$lib/icons/XMark.svelte';
	import { formatFyTickX } from '$lib/utils/formatters';
	import { writeToClipboard } from '$lib/utils/clipboard';

	import { viewSectionOptions } from '../page-data-options/view-sections';
	import { dataTypeDisplayOptions } from '../page-data-options/data-types';
	import { scenarioLabels } from '../page-data-options/descriptions';
	import { modelOptions, modelScenarioPathwayOptions } from '../page-data-options/models';
	import { groupOptions as groupTechnologyOptions } from '../page-data-options/groups-technology';
	import { groupOptions as groupScenarioOptions } from '../page-data-options/groups-scenario';
	import { chartXTicks, miniChartXTicks } from '../page-data-options/chart-ticks';
	import ScenarioSelection from './ScenarioSelection.svelte';
	import DownloadButton from './DownloadButton.svelte';

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

	const dataVizStores = [
		getContext('energy-data-viz'),
		getContext('emissions-data-viz'),
		getContext('capacity-data-viz'),
		getContext('intensity-data-viz')
	];

	let showMobileFilterOptions = false;
	let copying = false;

	init();

	function init() {
		$selectedViewSection = 'technology'; // scenario, technology, region
		$selectedCharts = ['generation', 'emissions', 'intensity', 'capacity'];

		const defaultModel = modelOptions[0];

		// default to the first model and scenario
		$singleSelectionData = {
			id: defaultModel.scenarios[0].id,
			model: defaultModel.value,
			scenario: defaultModel.scenarios[0].value,
			pathway: defaultModel.defaultPathway
		};

		// default to the first model and all its scenarios
		$multiSelectionData = defaultModel.scenarios.map((s) =>
			modelScenarioPathwayOptions.find((m) => m.id === `${s.id}-${defaultModel.defaultPathway}`)
		);
		// {
		// 	id: s.id,
		// 	model: defaultModel.value,
		// 	scenario: s.value,
		// 	pathway: defaultModel.defaultPathway
		// }

		// let allSelections = [];
		// // load all selections
		// modelOptions.forEach((model) => {
		// 	allSelections = [
		// 		...allSelections,
		// 		...model.scenarios.map((s) => ({
		// 			id: s.id,
		// 			model: model.value,
		// 			scenario: s.value,
		// 			pathway: model.defaultPathway
		// 		}))
		// 	];
		// });
		// $multiSelectionData = allSelections;

		$selectedDataType = 'energy';
		$selectedRegion = '_all';

		if ($isTechnologyViewSection) {
			$selectedFuelTechGroup = groupTechnologyOptions[0].value;
		} else {
			$selectedFuelTechGroup = groupScenarioOptions[0].value;
		}

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
		const overlayLineDate = { date: overlayDates.xStartValue };

		dataVizStores.forEach((store) => {
			store.chartOverlay.set(overlayDates);
			store.chartOverlayLine.set(overlayLineDate);
		});
	}

	$: {
		// TODO: if singleselection model changes, update xTicks, otherwise use default xTicks
		dataVizStores.forEach((store) => {
			if ($isScenarioViewSection) {
				store.xTicks.set(chartXTicks['aemo2024']);
				store.miniXTicks.set(miniChartXTicks['aemo2024']);
			} else {
				store.xTicks.set(chartXTicks[$singleSelectionData.model]);
				store.miniXTicks.set(miniChartXTicks[$singleSelectionData.model]);
			}
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
	 * When switching views, reset the data stores and fuel tech group
	 * @param {ScenarioViewSection} prevView
	 * @param {ScenarioViewSection} view
	 */
	function handleDisplayViewChange(prevView, view) {
		console.log('prevView', prevView, 'view', view);
		if (prevView === view) return;

		$selectedViewSection = view;

		if (view === 'technology') {
			$selectedFuelTechGroup = groupTechnologyOptions[0].value;
		} else {
			$selectedFuelTechGroup = groupScenarioOptions[0].value;
		}

		dataVizStores.forEach((store) => {
			store.reset();
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
			$selectedCharts = $selectedCharts.filter((d) => d !== dataType);
		} else {
			$selectedCharts = [...$selectedCharts, dataType];
		}
	}

	function copyLink() {
		copying = true;
		const url = window.location.href;
		writeToClipboard(url);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}
</script>

{#if showMobileFilterOptions}
	<Modal
		maxWidthClass=""
		class="!fixed bg-white top-0 bottom-0 left-0 right-0 overflow-y-auto overscroll-contain !rounded-none !my-0 pt-0 px-0 z-50"
	>
		<header
			class="sticky top-0 z-50 bg-white pb-2 pt-6 px-10 flex justify-between items-center border-b border-warm-grey"
		>
			<h3 class="mb-2">Filters</h3>

			<div class="mb-2">
				<IconAdjustmentsHorizontal class="size-10" />
			</div>
		</header>

		<section class="p-10 w-full flex gap-12">
			<FormMultiSelect
				options={dataTypeDisplayOptions}
				selected={$selectedCharts}
				label="Charts"
				paddingX=""
				staticDisplay={true}
				selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
				on:change={(evt) => handleDataTypeChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>

			{#if $isTechnologyViewSection || $isScenarioViewSection}
				<FormSelect
					formLabel="Region"
					options={regionOptions}
					selected={$selectedRegion}
					paddingX=""
					staticDisplay={true}
					selectedLabelClass="font-space uppercase text-sm font-semibold text-dark-grey"
					on:change={(evt) => ($selectedRegion = evt.detail.value)}
				/>
			{/if}
		</section>

		<!-- <h4 class="font-space uppercase text-sm text-dark-grey border-t border-warm-grey p-10">
			Scenarios
		</h4> -->
		<ScenarioSelection mobileView={true} />

		<div slot="buttons" class="flex gap-3">
			<!-- <Button class="w-full">Cancel</Button> -->
			<Button
				class="!bg-dark-grey text-white hover:!bg-black w-full"
				on:click={() => (showMobileFilterOptions = false)}>Close</Button
			>
		</div>
	</Modal>
{/if}

<div
	class="max-w-none flex gap-10 md:gap-16 justify-between px-10 md:px-16 py-6 border-b border-warm-grey"
>
	<div class="w-full flex items-center justify-between md:justify-start gap-8 md:gap-18">
		<div class="sm:hidden">
			<FormSelect
				options={viewSectionOptions}
				selected={$selectedViewSection}
				paddingX="px-4"
				paddingY="py-3"
				on:change={(evt) => handleDisplayViewChange($selectedViewSection, evt.detail.value)}
			/>
		</div>

		<div class="hidden sm:block">
			<Switch
				buttons={viewSectionOptions}
				selected={$selectedViewSection}
				on:change={(evt) => handleDisplayViewChange($selectedViewSection, evt.detail.value)}
				class="justify-center my-4"
			/>
		</div>

		<div class="md:hidden pl-8 ml-4 border-l border-warm-grey">
			<ButtonIcon on:click={() => (showMobileFilterOptions = true)}>
				<IconAdjustmentsHorizontal class="size-10" />
			</ButtonIcon>
		</div>

		<div
			class="hidden md:flex py-2 items-center gap-6 pl-4 ml-4 relative z-40 border-l border-warm-grey"
		>
			<div class="flex items-center whitespace-nowrap">
				<FormMultiSelect
					options={dataTypeDisplayOptions}
					selected={$selectedCharts}
					label="Charts"
					paddingX="px-7"
					paddingY="py-3"
					on:change={(evt) => handleDataTypeChange(evt.detail.value, evt.detail.isMetaPressed)}
				/>

				{#if $isTechnologyViewSection || $isScenarioViewSection}
					<FormSelect
						options={regionOptions}
						selected={$selectedRegion}
						paddingX="px-7"
						paddingY="py-3"
						on:change={(evt) => ($selectedRegion = evt.detail.value)}
					/>
				{/if}
			</div>

			<!-- <FormSelect
				options={groupOptions}
				selected={$selectedFuelTechGroup}
				on:change={(evt) => ($selectedFuelTechGroup = evt.detail.value)}
			/> -->

			{#if $singleSelectionModel && $singleSelectionScenario}
				<button
					class="text-sm flex items-center gap-3 justify-center px-8 py-4 border rounded-xl whitespace-nowrap bg-white text-dark-grey"
					class:border-dark-grey={$showScenarioOptions}
					class:border-mid-warm-grey={!$showScenarioOptions}
					on:click={() => ($showScenarioOptions = !$showScenarioOptions)}
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

	<div class="hidden sm:flex items-center gap-4 border-l border-warm-grey pl-8">
		<DownloadButton />

		<button
			class="bg-black text-white p-3 rounded-lg transition-all hover:bg-dark-grey"
			on:click={copyLink}
		>
			{#if copying}
				<IconClipboardDocumentCheck class="size-8" />
			{:else}
				<IconShare class="size-8" />
			{/if}
		</button>
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
