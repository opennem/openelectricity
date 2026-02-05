import { derived, writable } from 'svelte/store';
import { modelScenarios, defaultPathwayOrder } from '../page-data-options/models';

export default function () {
	/** @type {import('svelte/store').Writable<any[]>} */
	const selectionData = writable([]);
	const orderedModelScenarioPathways = derived(selectionData, (/** @type {any[]} */ $selectionData) => {
		/** @type {any[]} */
		let orderModels = [];

		Object.keys(modelScenarios).forEach((model) => {
			const findModel = $selectionData.find((/** @type {any} */ selection) => selection.model === model);

			if (findModel) {
				/** @type {any} */
				const ordered = { model };

				// make sure scenario order is returned in the order of the modelScenarios
				const filterPathways = $selectionData.filter((/** @type {any} */ selection) => selection.model === model);
				const scenarioOrder = /** @type {Record<string, any>} */ (modelScenarios)[model].map((/** @type {{ id: string }} */ { id }) => id);
				const scenarios = [...new Set(filterPathways.map((/** @type {any} */ pathway) => pathway.scenario))];
				const returnedOrder = scenarioOrder.filter((/** @type {string} */ scenario) => scenarios.includes(scenario));
				ordered.scenarios = returnedOrder.map((/** @type {string} */ scenario) => {
					const pathways = filterPathways.filter((/** @type {any} */ pathway) => pathway.scenario === scenario);
					const orderedPathways = defaultPathwayOrder.filter((/** @type {string} */ pathway) =>
						pathways.find((/** @type {any} */ p) => p.pathway === pathway)
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
