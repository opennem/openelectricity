import { describe, it, expect } from 'vitest';
import { deriveIntensityRows } from './intensity-lines.js';

const TZ = 'Australia/Brisbane';

/** Daily energy basis — native MWh, no interval conversion. */
const ENERGY_OPTS = { isEnergyInterval: true, displayInterval: '1d', ianaTimeZone: TZ };

describe('deriveIntensityRows', () => {
	it('converts tonnes → kg over the summed energy (kgCO₂e/MWh)', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [{ date: new Date(1), time: 1, emissions_U1: 6, emissions_U2: 4 }],
			emissionsSeriesNames: ['emissions_U1', 'emissions_U2'],
			basisRows: [{ time: 1, energy_U1: 12, energy_U2: 8 }],
			basisSeriesNames: ['energy_U1', 'energy_U2'],
			energyOpts: ENERGY_OPTS
		});
		// (6 + 4) t × 1000 / (12 + 8) MWh = 500 kgCO₂e/MWh
		expect(rows).toEqual([{ date: new Date(1), time: 1, intensity: 500 }]);
	});

	it('nulls rows with zero energy (idle intervals)', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [{ date: new Date(1), time: 1, emissions_U1: 0 }],
			emissionsSeriesNames: ['emissions_U1'],
			basisRows: [{ time: 1, energy_U1: 0 }],
			basisSeriesNames: ['energy_U1'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].intensity).toBeNull();
	});

	it('nulls rows with negative energy (net-charging storage)', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [{ date: new Date(1), time: 1, emissions_U1: 2 }],
			emissionsSeriesNames: ['emissions_U1'],
			basisRows: [{ time: 1, energy_U1: -40 }],
			basisSeriesNames: ['energy_U1'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].intensity).toBeNull();
	});

	it('aligns basis rows to emissions rows by time, not by index', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [
				{ date: new Date(1), time: 1, emissions_U1: 5 },
				{ date: new Date(2), time: 2, emissions_U1: 3 }
			],
			emissionsSeriesNames: ['emissions_U1'],
			// Reversed order, and no basis row for time 2.
			basisRows: [{ time: 1, energy_U1: 10 }],
			basisSeriesNames: ['energy_U1'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].intensity).toBe(500); // 5 t × 1000 / 10 MWh
		expect(rows[1].intensity).toBeNull(); // missing basis row → 0 MWh → null
	});

	it('converts MW → MWh for the sub-daily power basis', () => {
		// 30m display: 100 MW ≈ 50 MWh.
		const rows = deriveIntensityRows({
			emissionsRows: [{ date: new Date(1), time: 1, emissions_U1: 25 }],
			emissionsSeriesNames: ['emissions_U1'],
			basisRows: [{ time: 1, power_U1: 100 }],
			basisSeriesNames: ['power_U1'],
			energyOpts: { isEnergyInterval: false, displayInterval: '30m', ianaTimeZone: TZ }
		});
		expect(rows[0].intensity).toBe(500); // 25 t × 1000 / 50 MWh
	});

	it('skips non-numeric series values when summing emissions', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [{ date: new Date(1), time: 1, emissions_U1: 5, emissions_U2: null }],
			emissionsSeriesNames: ['emissions_U1', 'emissions_U2'],
			basisRows: [{ time: 1, energy_U1: 10 }],
			basisSeriesNames: ['energy_U1'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].intensity).toBe(500);
	});

	it('returns an empty array for empty emissions rows', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [],
			emissionsSeriesNames: [],
			basisRows: [{ time: 1, energy_U1: 10 }],
			basisSeriesNames: ['energy_U1'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows).toEqual([]);
	});

	it('nulls every row when there are no basis rows at all', () => {
		const rows = deriveIntensityRows({
			emissionsRows: [{ date: new Date(1), time: 1, emissions_U1: 5 }],
			emissionsSeriesNames: ['emissions_U1'],
			basisRows: [],
			basisSeriesNames: [],
			energyOpts: ENERGY_OPTS
		});
		expect(rows).toEqual([{ date: new Date(1), time: 1, intensity: null }]);
	});
});
