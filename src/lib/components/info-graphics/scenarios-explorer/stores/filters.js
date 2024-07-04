import { derived, writable } from 'svelte/store';
import {
	modelOptions,
	regionOptions,
	dataViewOptions,
	displayViewOptions,
	chartTypeOptions,
	xTicks
} from '../options';
import { fi } from 'date-fns/locale';

export default function (filters) {
	// const selectedModel = writable(modelOptions[0].value);
	const selectedModel = writable(filters?.model || modelOptions[0].value);
	const selectedDataView = writable(filters?.dataView || dataViewOptions[0].value);
	const selectedDisplayView = writable(filters?.displayView || displayViewOptions[0].value);
	const selectedChartType = writable(filters?.chartType || chartTypeOptions[0].value);
	const selectedRegion = writable(filters?.region || regionOptions[0].value);
	const selectedScenario = writable(filters?.scenario || '');
	const selectedPathway = writable(filters?.pathway || '');
	const selectedGroup = writable(filters?.group || '');

	const selectedMultipleScenarios = writable(filters?.multipleScenarios || []);

	const showScenarioOptions = writable(false);

	const scenarioOptions = writable([]);
	const pathwayOptions = writable([]);

	const modelXTicks = derived(selectedModel, ($selectedModel) => {
		return xTicks[$selectedModel];
	});

	const selectedDataDescription = derived(selectedDataView, ($selectedDataView) => {
		const find = dataViewOptions.find((d) => d.value === $selectedDataView);
		return find ? find.description : '';
	});

	const selectedDataLabel = derived(selectedDataView, ($selectedDataView) => {
		const find = dataViewOptions.find((d) => d.value === $selectedDataView);
		return find ? find.label : '';
	});

	const isTechnologyDisplay = derived(
		selectedDisplayView,
		($selectedDisplayView) => $selectedDisplayView === 'technology'
	);
	const isScenarioDisplay = derived(
		selectedDisplayView,
		($selectedDisplayView) => $selectedDisplayView === 'scenario'
	);
	const isRegionDisplay = derived(
		selectedDisplayView,
		($selectedDisplayView) => $selectedDisplayView === 'region'
	);

	return {
		modelOptions: modelOptions,
		selectedModel: selectedModel,
		modelXTicks: modelXTicks,

		regionOptions: regionOptions,
		selectedRegion: selectedRegion,

		dataViewOptions: dataViewOptions,
		selectedDataView: selectedDataView,
		selectedDataDescription: selectedDataDescription,
		selectedDataLabel: selectedDataLabel,

		displayViewOptions: displayViewOptions,
		selectedDisplayView: selectedDisplayView,

		isTechnologyDisplay: isTechnologyDisplay,
		isScenarioDisplay: isScenarioDisplay,
		isRegionDisplay: isRegionDisplay,

		chartTypeOptions: chartTypeOptions,
		selectedChartType: selectedChartType,

		scenarioOptions: scenarioOptions,
		pathwayOptions: pathwayOptions,
		selectedScenario: selectedScenario,
		selectedPathway: selectedPathway,

		selectedGroup: selectedGroup,

		selectedMultipleScenarios: selectedMultipleScenarios,

		showScenarioOptions: showScenarioOptions
	};
}
