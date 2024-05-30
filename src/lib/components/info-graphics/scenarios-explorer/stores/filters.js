import { derived, writable } from 'svelte/store';
import {
	modelOptions,
	regionOptions,
	dataViewOptions,
	displayViewOptions,
	chartTypeOptions,
	xTicks
} from '../options';

export default function () {
	const selectedModel = writable(modelOptions[0].value);
	const selectedDataView = writable(dataViewOptions[0].value);
	const selectedDisplayView = writable(displayViewOptions[0].value);
	const selectedChartType = writable(chartTypeOptions[0].value);
	const selectedRegion = writable(regionOptions[0].value);
	const selectedScenario = writable('');
	const selectedPathway = writable('');
	const selectedGroup = writable('');
	const selectedCompareGroup = writable('');

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

		chartTypeOptions: chartTypeOptions,
		selectedChartType: selectedChartType,

		scenarioOptions: scenarioOptions,
		pathwayOptions: pathwayOptions,
		selectedScenario: selectedScenario,
		selectedPathway: selectedPathway,

		selectedGroup: selectedGroup,

		selectedCompareGroup: selectedCompareGroup
	};
}
