import outlookEnergyNem2022 from '$lib/models/aemo-isp-2022/au/NEM/energy/outlook.json';
import outlookEnergyNem from '$lib/models/aemo-draft-isp-2024/au/NEM/energy/outlook.json';

/**
 * @param {any} projectionData
 */
function parseIsp(projectionData) {
	const data = projectionData.data;
	const updatedDataToTera = data.map((/** @type {any} */ d) => {
		const projection = { ...d.projection };
		projection.data = projection.data.map((/** @type {number} */ d) => d / 1000);

		return {
			...d,
			projection
		};
	});

	const pathways = [...new Set(data.map((/** @type {any} */ d) => d.pathway))];
	const scenarios = [...new Set(data.map((/** @type {any} */ d) => d.scenario))].sort().reverse();
	const fuelTechs = [...new Set(data.map((/** @type {any} */ d) => d.fuel_tech))].sort();

	return {
		outlookEnergyNem: {
			...projectionData,
			data: updatedDataToTera
		},
		pathways,
		scenarios,
		fuelTechs
	};
}

const aemo2022 = parseIsp(outlookEnergyNem2022);
const aemo2024 = parseIsp(outlookEnergyNem);

export default { aemo2022, aemo2024 };
