import { derived, writable } from 'svelte/store';
import { modelScenarios, defaultPathwayOrder } from '../page-data-options/models';

export default function () {
	const selectionData = writable([]);
	const orderedModelScenarioPathways = derived(selectionData, ($selectionData) => {
		let orderModels = [];

		Object.keys(modelScenarios).forEach((model) => {
			const findModel = $selectionData.find((selection) => selection.model === model);

			if (findModel) {
				const ordered = { model };

				// make sure scenario order is returned in the order of the modelScenarios
				const filterPathways = $selectionData.filter((selection) => selection.model === model);
				const scenarioOrder = modelScenarios[model].map(({ id }) => id);
				const scenarios = [...new Set(filterPathways.map((pathway) => pathway.scenario))];
				const returnedOrder = scenarioOrder.filter((scenario) => scenarios.includes(scenario));
				ordered.scenarios = returnedOrder.map((scenario) => {
					const pathways = filterPathways.filter((pathway) => pathway.scenario === scenario);
					const orderedPathways = defaultPathwayOrder.filter((pathway) =>
						pathways.find((p) => p.pathway === pathway)
					);
					return {
						scenario,
						pathways: orderedPathways
					};
				});

				orderModels.push(ordered);
			}
		});

		return orderModels;
	});

	return {
		selectionData,
		orderedModelScenarioPathways
	};
}
