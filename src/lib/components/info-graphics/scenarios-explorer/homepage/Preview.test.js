import { describe, it, expect } from 'vitest';
import processTechnology from '../../../../../routes/(main)/scenarios/page-data-options/process-technology.js';
import { fuelTechMap, orderMap } from '../../../../../routes/(main)/scenarios/page-data-options/groups-technology.js';

/**
 * Create a minimal projection StatsData entry for the scenario pipeline.
 */
function makeProjectionStats({ fuelTech, data, units = 'GWh' }) {
	return {
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		code: fuelTech,
		fuel_tech: fuelTech,
		units,
		label: fuelTech,
		colour: '#aaa',
		projection: {
			start: '2024-07-01T00:00:00+10:00',
			last: '2026-07-01T00:00:00+10:00',
			interval: '1Y',
			data
		}
	};
}

function makeHistoryStats({ fuelTech, data, units = 'GWh' }) {
	return {
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		code: fuelTech,
		fuel_tech: fuelTech,
		units,
		label: fuelTech,
		colour: '#bbb',
		history: {
			start: '2022-01-01T00:00:00+10:00',
			last: '2024-12-01T00:00:00+10:00',
			interval: '1M',
			data
		}
	};
}

const colourReducer = (acc, d) => {
	acc[d.id] = d.colour || '#999';
	return acc;
};

function monthlyData(baseValue) {
	return Array.from({ length: 36 }, (_, i) => baseValue + i);
}

/** All fuel techs that appear in the homepage_preview group (flattened from fuelTechMap) */
const previewFuelTechs = [
	'coal_black',
	'coal_brown',
	'gas_ccgt',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'gas_hydrogen',
	'gas_ccgt_ccs',
	'hydro',
	'wind',
	'wind_offshore',
	'solar_utility',
	'solar_rooftop'
];

/** All fuel techs that appear in the homepage_renewables_vs_fossil_fuels group */
const renewableVsFossilFuelTechs = [
	'coal_black',
	'coal_brown',
	'distillate',
	'gas_ccgt',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'gas_hydrogen',
	'gas_ccgt_ccs',
	'hydro',
	'wind',
	'wind_offshore',
	'solar_utility',
	'solar_rooftop',
	'bioenergy',
	'bioenergy_biomass',
	'bioenergy_biogas',
	'solar_thermal'
];

describe('Homepage Preview data pipeline', () => {
	describe('homepage_preview group', () => {
		it('returns a valid ProcessedDataViz shape', () => {
			const projection = previewFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = previewFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_preview',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result).toHaveProperty('seriesData');
			expect(result).toHaveProperty('seriesNames');
			expect(result).toHaveProperty('seriesColours');
			expect(result).toHaveProperty('seriesLabels');
			expect(result).toHaveProperty('yDomain');
			expect(result).toHaveProperty('baseUnit');
		});

		it('produces seriesNames matching the 6 homepage fuel tech groups', () => {
			const projection = previewFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = previewFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_preview',
				colourReducer,
				includeBatteryAndLoads: false
			});

			const expectedGroups = ['coal', 'gas', 'hydro', 'wind', 'solar_utility', 'solar_rooftop'];
			for (const group of expectedGroups) {
				const hasGroup = result.seriesNames.some((name) => name.includes(group));
				expect(hasGroup, `seriesNames should contain '${group}'`).toBe(true);
			}
		});

		it('produces seriesData with time and date properties', () => {
			const projection = previewFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = previewFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_preview',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result.seriesData.length).toBeGreaterThan(0);
			result.seriesData.forEach((d) => {
				expect(d).toHaveProperty('time');
				expect(d).toHaveProperty('date');
				expect(d.date).toBeInstanceOf(Date);
			});
		});

		it('populates seriesColours and seriesLabels for all series', () => {
			const projection = previewFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = previewFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_preview',
				colourReducer,
				includeBatteryAndLoads: false
			});

			for (const name of result.seriesNames) {
				expect(result.seriesColours[name], `colour for ${name}`).toBeDefined();
				expect(result.seriesLabels[name], `label for ${name}`).toBeDefined();
			}
		});

		it('sets projectionStartTime', () => {
			const projection = previewFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = previewFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_preview',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result.projectionStartTime).toBeDefined();
			expect(typeof result.projectionStartTime).toBe('number');
		});
	});

	describe('homepage_renewables_vs_fossil_fuels group', () => {
		it('produces seriesNames with fossil and renewable groups', () => {
			const projection = renewableVsFossilFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = renewableVsFossilFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_renewables_vs_fossil_fuels',
				colourReducer,
				includeBatteryAndLoads: false
			});

			const hasFossil = result.seriesNames.some((name) => name.includes('fossil'));
			const hasRenewable = result.seriesNames.some((name) => name.includes('renewable'));

			expect(hasFossil, 'seriesNames should contain fossil').toBe(true);
			expect(hasRenewable, 'seriesNames should contain renewable').toBe(true);
		});

		it('returns a valid ProcessedDataViz shape', () => {
			const projection = renewableVsFossilFuelTechs.map((ft) =>
				makeProjectionStats({ fuelTech: ft, data: [100, 110, 120] })
			);
			const history = renewableVsFossilFuelTechs.map((ft) =>
				makeHistoryStats({ fuelTech: ft, data: monthlyData(50) })
			);

			const result = processTechnology.generation({
				projection,
				history,
				group: 'homepage_renewables_vs_fossil_fuels',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result).toHaveProperty('seriesData');
			expect(result).toHaveProperty('seriesNames');
			expect(result).toHaveProperty('seriesColours');
			expect(result).toHaveProperty('seriesLabels');
			expect(result.seriesData.length).toBeGreaterThan(0);
		});
	});

	describe('group registration', () => {
		it('homepage_preview is registered in fuelTechMap', () => {
			expect(fuelTechMap).toHaveProperty('homepage_preview');
			expect(fuelTechMap['homepage_preview']).toHaveProperty('coal');
			expect(fuelTechMap['homepage_preview']).toHaveProperty('gas');
			expect(fuelTechMap['homepage_preview']).toHaveProperty('wind');
			expect(fuelTechMap['homepage_preview']).toHaveProperty('solar_utility');
			expect(fuelTechMap['homepage_preview']).toHaveProperty('solar_rooftop');
			expect(fuelTechMap['homepage_preview']).toHaveProperty('hydro');
		});

		it('homepage_renewables_vs_fossil_fuels is registered in fuelTechMap', () => {
			expect(fuelTechMap).toHaveProperty('homepage_renewables_vs_fossil_fuels');
			expect(fuelTechMap['homepage_renewables_vs_fossil_fuels']).toHaveProperty('fossil');
			expect(fuelTechMap['homepage_renewables_vs_fossil_fuels']).toHaveProperty('renewable');
		});

		it('homepage groups are registered in orderMap', () => {
			expect(orderMap).toHaveProperty('homepage_preview');
			expect(orderMap).toHaveProperty('homepage_renewables_vs_fossil_fuels');
			expect(Array.isArray(orderMap['homepage_preview'])).toBe(true);
			expect(Array.isArray(orderMap['homepage_renewables_vs_fossil_fuels'])).toBe(true);
		});
	});
});
