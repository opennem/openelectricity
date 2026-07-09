import { describe, it, expect } from 'vitest';
import {
	partitionSeriesByDirection,
	derivePriceRows,
	genPriceLabel,
	loadPriceLabel
} from './price-lines.js';

const TZ = 'Australia/Brisbane';

/** Daily energy basis — native MWh, no interval conversion. */
const ENERGY_OPTS = { isEnergyInterval: true, displayInterval: '1d', ianaTimeZone: TZ };

describe('partitionSeriesByDirection', () => {
	it('splits prefixed series names by bare load codes', () => {
		const { gen, load } = partitionSeriesByDirection(
			['energy_SF1', 'energy_BESS_L', 'energy_BESS_G'],
			'energy',
			['BESS_L']
		);
		expect(gen).toEqual(['energy_SF1', 'energy_BESS_G']);
		expect(load).toEqual(['energy_BESS_L']);
	});

	it('puts everything on the generation side when there are no loads', () => {
		const { gen, load } = partitionSeriesByDirection(['power_U1'], 'power', []);
		expect(gen).toEqual(['power_U1']);
		expect(load).toEqual([]);
	});
});

describe('derivePriceRows', () => {
	it('matches the plain facility-wide VWAP for a generation-only facility', () => {
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_U1: 3000, market_value_U2: 2000 }],
			mvSeriesNames: ['market_value_U1', 'market_value_U2'],
			basisRows: [{ time: 1, energy_U1: 60, energy_U2: 40 }],
			basisSeriesNames: ['energy_U1', 'energy_U2'],
			basisMetric: 'energy',
			loadCodes: [],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].price).toBe(50); // 5000 / 100 MWh
		expect(rows[0].loadPrice).toBeNull();
	});

	it('derives independent charge/discharge prices for a split battery', () => {
		// Load series arrive inverted (negative) from processFacilityPower.
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_G: 5702, market_value_L: -1913 }],
			mvSeriesNames: ['market_value_G', 'market_value_L'],
			basisRows: [{ time: 1, energy_G: 168, energy_L: -608 }],
			basisSeriesNames: ['energy_G', 'energy_L'],
			basisMetric: 'energy',
			loadCodes: ['L'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].price).toBeCloseTo(5702 / 168, 6); // discharge VWAP
		expect(rows[0].loadPrice).toBeCloseTo(-1913 / -608, 6); // positive charge cost
	});

	it('reports a negative charge price when the unit was paid to consume', () => {
		// Raw mv was negative (paid to charge); inversion makes it positive
		// while the inverted energy stays negative.
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_L: 2192 }],
			mvSeriesNames: ['market_value_L'],
			basisRows: [{ time: 1, energy_L: -608 }],
			basisSeriesNames: ['energy_L'],
			basisMetric: 'energy',
			loadCodes: ['L'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].loadPrice).toBeCloseTo(2192 / -608, 6);
		expect(rows[0].loadPrice).toBeLessThan(0);
		expect(rows[0].price).toBeNull(); // all-load set: no generation line
	});

	it('keeps solar + discharging on the generation side of a mixed facility', () => {
		const rows = derivePriceRows({
			mvRows: [
				{
					date: new Date(1),
					time: 1,
					market_value_SF1: 8000,
					market_value_BESS_G: 2000,
					market_value_BESS_L: -500
				}
			],
			mvSeriesNames: ['market_value_SF1', 'market_value_BESS_G', 'market_value_BESS_L'],
			basisRows: [{ time: 1, energy_SF1: 150, energy_BESS_G: 50, energy_BESS_L: -100 }],
			basisSeriesNames: ['energy_SF1', 'energy_BESS_G', 'energy_BESS_L'],
			basisMetric: 'energy',
			loadCodes: ['BESS_L'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].price).toBe(50); // (8000 + 2000) / (150 + 50)
		expect(rows[0].loadPrice).toBe(5); // -500 / -100
	});

	it('treats pumped-hydro pumps as the load side', () => {
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_HYD1: 12000, market_value_PUMP1: -900 }],
			mvSeriesNames: ['market_value_HYD1', 'market_value_PUMP1'],
			basisRows: [{ time: 1, energy_HYD1: 100, energy_PUMP1: -60 }],
			basisSeriesNames: ['energy_HYD1', 'energy_PUMP1'],
			basisMetric: 'energy',
			loadCodes: ['PUMP1'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].price).toBe(120);
		expect(rows[0].loadPrice).toBe(15);
	});

	it('nulls each side without volume in its direction (idle rows)', () => {
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_G: 0, market_value_L: 0 }],
			mvSeriesNames: ['market_value_G', 'market_value_L'],
			basisRows: [{ time: 1, energy_G: 0, energy_L: 0 }],
			basisSeriesNames: ['energy_G', 'energy_L'],
			basisMetric: 'energy',
			loadCodes: ['L'],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].price).toBeNull();
		expect(rows[0].loadPrice).toBeNull();
	});

	it('nulls a net-signed bidirectional battery while net-charging (documented limitation)', () => {
		// The net `battery` unit is not a load, so it sits on the generation side;
		// a net-negative day cannot be priced. Callers wanting price in net view
		// should pass the split unit set instead (priceFacility).
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_VBB1: 5710 }],
			mvSeriesNames: ['market_value_VBB1'],
			basisRows: [{ time: 1, energy_VBB1: -440 }],
			basisSeriesNames: ['energy_VBB1'],
			basisMetric: 'energy',
			loadCodes: [],
			energyOpts: ENERGY_OPTS
		});
		expect(rows[0].price).toBeNull();
		expect(rows[0].loadPrice).toBeNull();
	});

	it('converts MW → MWh for the sub-daily power basis', () => {
		// 30m display: 100 MW ≈ 50 MWh; charging −60 MW ≈ −30 MWh.
		const rows = derivePriceRows({
			mvRows: [{ date: new Date(1), time: 1, market_value_G: 5000, market_value_L: -1500 }],
			mvSeriesNames: ['market_value_G', 'market_value_L'],
			basisRows: [{ time: 1, power_G: 100, power_L: -60 }],
			basisSeriesNames: ['power_G', 'power_L'],
			basisMetric: 'power',
			loadCodes: ['L'],
			energyOpts: { isEnergyInterval: false, displayInterval: '30m', ianaTimeZone: TZ }
		});
		expect(rows[0].price).toBe(100); // 5000 / 50 MWh
		expect(rows[0].loadPrice).toBe(50); // -1500 / -30 MWh
	});
});

describe('genPriceLabel', () => {
	it('names the side "Discharge price" for a pure battery discharge side', () => {
		expect(genPriceLabel(['battery_discharging'])).toBe('Discharge price');
	});

	it('uses "Generation price" for mixed generation', () => {
		expect(genPriceLabel(['solar_utility', 'battery_discharging'])).toBe('Generation price');
	});
});

describe('loadPriceLabel', () => {
	it('specialises battery charging variants to "Charge price"', () => {
		expect(loadPriceLabel(['battery_charging'])).toBe('Charge price');
		expect(loadPriceLabel(['battery_VPP_charging', 'battery_charging'])).toBe('Charge price');
	});

	it('specialises pumps to "Pumping price"', () => {
		expect(loadPriceLabel(['pumps'])).toBe('Pumping price');
	});

	it('falls back to "Load price" for mixed load kinds', () => {
		expect(loadPriceLabel(['pumps', 'battery_charging'])).toBe('Load price');
	});
});
