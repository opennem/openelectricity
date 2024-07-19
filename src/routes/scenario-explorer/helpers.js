import { getScenarioJson } from '$lib/scenarios';
import { getHistory, getAllRegionHistory } from '$lib/opennem';
import {
	allScenarios,
	regionsOnly,
	defaultModelPathway,
	defaultPathwayOrder
} from '$lib/components/info-graphics/scenarios-explorer/options';
import {
	covertHistoryDataToTWh,
	mergeHistoricalEmissionsData
} from '$lib/components/info-graphics/scenarios-explorer/helpers';

/**
 * Get data for by technology view
 * @param {*} param0
 */
async function getTechnologyData({ model, region, scenario, pathway, dataView }) {
	const [historyData, scenarioData] = await Promise.all([
		getHistory(region, dataView),
		getScenarioJson(model, scenario)
	]);
	/** @type {*} */
	let energyHistoryData = [];

	if (dataView === 'emissions') {
		const mergedEmissionsData = mergeHistoricalEmissionsData(historyData);
		// also fetch energy data to calculate emissions intensity
		energyHistoryData = await getHistory(region, 'energy');

		// emissions / energy delivered (generation + storage_discharging - storage_charging)

		console.log('energyHistoryData', energyHistoryData);
		console.log('mergedEmissionsData', mergedEmissionsData);
	}

	const filteredScenarioData = scenarioData.data.filter(
		(d) =>
			d.pathway === pathway &&
			d.region.toLowerCase() === region.toLowerCase() &&
			d.type === dataView
	);

	console.log('filteredScenarioData', filteredScenarioData);

	const projection = filteredScenarioData.map((d) => {
		return {
			...d,
			model: model,
			fuel_tech: dataView === 'emissions' ? 'fossil_fuels' : d.fuel_tech // change to fossil_fuels for emissions
		};
	});

	const history =
		dataView === 'emissions'
			? mergeHistoricalEmissionsData(historyData)
			: covertHistoryDataToTWh(historyData);

	console.log('technologyProjectionData', projection);
	console.log('technologyHistoricalData', history);

	return {
		projection,
		history,
		pathways: scenarioData.pathways
	};
}

export { getTechnologyData };
