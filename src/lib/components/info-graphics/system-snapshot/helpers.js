import { scaleQuantile, scaleLinear } from 'd3-scale';
export const colourRanges = [0, 0.0625, 0.0656, 0.0688, 0.0813, 0.125, 0.375, 1];
export const colours = [
	'#F2F1EE',
	'#D1D0CD',
	'#B0B0AE',
	'#91918F',
	'#737372',
	'#565655',
	'#3B3B3B',
	'#222222'
];
export const labels = ['-$1k', '$0', '$50', '$100', '$300', '$1k', '$5k', '$15k'];

// [0, 0.0625, 0.0656, 0.0688, 0.0813, 0.125, 0.375, 1],
// [-1000, 0, 50, 100, 300, 1000, 5000, 15000],

export const priceColour = scaleQuantile(
	[-1000, 0, 50, 100, 300, 1000, 5000, 15000],
	['#F2F1EE', '#D1D0CD', '#B0B0AE', '#91918F', '#737372', '#565655', '#3B3B3B', '#222222']
);

// console.log('priceColour', priceColour(3000));
// console.log('intensityColour', intensityColour(250));

/** @type {FuelTechCode[]} */
export const loadFts = ['exports', 'battery_charging', 'pumps'];

/** @type {FuelTechCode[]} */
export const renewablesFts = [
	'hydro',
	'wind',
	'solar_rooftop',
	'solar_utility',
	'bioenergy_biomass'
];

export function regionGenerationTotal(regions, regionData) {
	const regionGeneration = {};

	regions.forEach((r) => {
		const region = regionData[r];
		const total = region.reduce(
			(acc, cur) => (loadFts.includes(cur.fuel_tech) ? acc - cur.data : acc + cur.data),
			0
		);
		regionGeneration[r] = total;
	});

	return regionGeneration;
}

export function regionRenewablesTotal(regions, regionData) {
	const regionRenewables = {};

	regions.forEach((r) => {
		const region = regionData[r];
		const total = region.reduce(
			(acc, cur) => (renewablesFts.includes(cur.fuel_tech) ? acc + cur.data : acc),
			0
		);
		regionRenewables[r] = total;
	});

	return regionRenewables;
}

export function regionEmissionsTotal(regions, regionData) {
	const regionEmissions = {};

	regions.forEach((r) => {
		const region = regionData[r];
		const total = region.reduce(
			(acc, cur) =>
				loadFts.includes(cur.fuel_tech)
					? cur.fuel_tech === 'exports'
						? acc - cur.data
						: acc
					: acc + cur.data,
			0
		);
		regionEmissions[r] = total;
	});

	return regionEmissions;
}
