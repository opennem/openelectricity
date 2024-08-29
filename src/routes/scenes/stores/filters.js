import { derived, writable } from 'svelte/store';
import { scenarioLabels } from '../page-data-options/descriptions';
import { regionsWithShortLabels } from '../page-data-options/regions';

export default function () {
	const selectedRegion = writable('');
	const selectedFuelTechGroup = writable('');

	/** @type {import('svelte/store').Writable<ScenarioSelect>} */
	const singleSelectionData = writable();
	/** @type {import('svelte/store').Writable<ScenarioSelect[]>} */
	const multiSelectionData = writable();

	/** @type {import('svelte/store').Writable<ScenarioViewSection | ''>} */
	const selectedViewSection = writable('');
	const selectedDataType = writable('');
	const selectedCharts = writable([]);

	const includeBatteryAndLoads = writable(true);

	const isTechnologyViewSection = derived(selectedViewSection, ($selectedViewSection) => {
		return $selectedViewSection === 'technology';
	});
	const isScenarioViewSection = derived(selectedViewSection, ($selectedViewSection) => {
		return $selectedViewSection === 'scenario';
	});
	const isRegionViewSection = derived(selectedViewSection, ($selectedViewSection) => {
		return $selectedViewSection === 'region';
	});

	const selectedRegionLabel = derived(selectedRegion, ($selectedRegion) => {
		return regionsWithShortLabels[$selectedRegion];
	});

	// derived selection mode based on view section
	const selectionMode = derived(isScenarioViewSection, ($isScenarioViewSection) => {
		return $isScenarioViewSection ? 'multiple' : 'single';
	});
	const isSingleSelectionMode = derived(selectionMode, ($selectionMode) => {
		return $selectionMode === 'single';
	});
	const singleSelectionModel = derived(singleSelectionData, ($singleSelectionData) => {
		return $singleSelectionData?.model;
	});
	const singleSelectionScenario = derived(singleSelectionData, ($singleSelectionData) => {
		return $singleSelectionData?.scenario;
	});
	const singleSelectionPathway = derived(singleSelectionData, ($singleSelectionData) => {
		return $singleSelectionData?.pathway;
	});
	const singleSelectionModelScenarioLabel = derived(
		[singleSelectionModel, singleSelectionScenario],
		([$singleSelectionModel, $singleSelectionScenario]) => {
			return scenarioLabels[$singleSelectionModel][$singleSelectionScenario];
		}
	);

	return {
		selectedRegion,
		selectedRegionLabel,
		selectedFuelTechGroup,

		selectionMode,
		isSingleSelectionMode,

		singleSelectionData,
		multiSelectionData,

		singleSelectionModel,
		singleSelectionScenario,
		singleSelectionPathway,
		singleSelectionModelScenarioLabel,

		selectedViewSection,
		selectedDataType,
		selectedCharts,

		isTechnologyViewSection,
		isScenarioViewSection,
		isRegionViewSection,

		includeBatteryAndLoads
	};
}
