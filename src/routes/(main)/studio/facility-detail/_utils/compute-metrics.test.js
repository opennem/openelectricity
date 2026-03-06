import { describe, it, expect } from 'vitest';
import {
	sumSeries,
	getHoursInRange,
	capacityFactor,
	avgPriceReceived,
	peakOutput,
	totalEmissions,
	runningHours,
	startCount,
	batteryMetrics,
	dcAcRatio
} from './compute-metrics.js';

// ── sumSeries ────────────────────────────────────────────────────────

describe('sumSeries', () => {
	it('sums numeric values for the given key', () => {
		const rows = [{ energy: 10 }, { energy: 20 }, { energy: 30 }];
		expect(sumSeries(rows, 'energy')).toBe(60);
	});

	it('ignores missing keys', () => {
		const rows = [{ energy: 10 }, { other: 5 }, { energy: 30 }];
		expect(sumSeries(rows, 'energy')).toBe(40);
	});

	it('ignores non-numeric values', () => {
		const rows = [{ energy: 10 }, { energy: 'bad' }, { energy: null }, { energy: NaN }];
		expect(sumSeries(rows, 'energy')).toBe(10);
	});

	it('returns 0 for empty rows', () => {
		expect(sumSeries([], 'energy')).toBe(0);
	});

	it('handles negative values', () => {
		const rows = [{ val: -10 }, { val: 5 }, { val: -3 }];
		expect(sumSeries(rows, 'val')).toBe(-8);
	});
});

// ── getHoursInRange ──────────────────────────────────────────────────

describe('getHoursInRange', () => {
	it('returns hours between first and last row', () => {
		const rows = [
			{ time: 0 },
			{ time: 3_600_000 }, // +1h
			{ time: 7_200_000 } // +2h
		];
		expect(getHoursInRange(rows)).toBe(2);
	});

	it('returns 0 for empty rows', () => {
		expect(getHoursInRange([])).toBe(0);
	});

	it('returns 0 for single row', () => {
		expect(getHoursInRange([{ time: 1000 }])).toBe(0);
	});

	it('handles 7-day range', () => {
		const sevenDaysMs = 7 * 24 * 3_600_000;
		const rows = [{ time: 0 }, { time: sevenDaysMs }];
		expect(getHoursInRange(rows)).toBe(168);
	});
});

// ── capacityFactor ───────────────────────────────────────────────────

describe('capacityFactor', () => {
	it('calculates capacity factor as percentage', () => {
		// 500 MWh over 100 hours at 10 MW = 50%
		expect(capacityFactor(500, 10, 100)).toBe(50);
	});

	it('returns 100% when energy equals theoretical max', () => {
		expect(capacityFactor(1000, 10, 100)).toBe(100);
	});

	it('returns 0 when capacity is 0', () => {
		expect(capacityFactor(500, 0, 100)).toBe(0);
	});

	it('returns 0 when hours is 0', () => {
		expect(capacityFactor(500, 10, 0)).toBe(0);
	});

	it('returns 0 when capacity is negative', () => {
		expect(capacityFactor(500, -10, 100)).toBe(0);
	});
});

// ── avgPriceReceived ─────────────────────────────────────────────────

describe('avgPriceReceived', () => {
	it('calculates $/MWh', () => {
		expect(avgPriceReceived(5000, 100)).toBe(50);
	});

	it('returns 0 when energy is 0', () => {
		expect(avgPriceReceived(5000, 0)).toBe(0);
	});

	it('handles negative market value', () => {
		expect(avgPriceReceived(-1000, 100)).toBe(-10);
	});
});

// ── peakOutput ───────────────────────────────────────────────────────

describe('peakOutput', () => {
	it('finds peak total across series', () => {
		const rows = [
			{ unit1: 50, unit2: 30 },
			{ unit1: 80, unit2: 40 },
			{ unit1: 60, unit2: 20 }
		];
		expect(peakOutput(rows, ['unit1', 'unit2'])).toBe(120); // 80+40
	});

	it('ignores negative values', () => {
		const rows = [{ unit1: 100, unit2: -50 }];
		expect(peakOutput(rows, ['unit1', 'unit2'])).toBe(100);
	});

	it('returns 0 for empty rows', () => {
		expect(peakOutput([], ['unit1'])).toBe(0);
	});

	it('returns 0 when all values are 0', () => {
		const rows = [{ unit1: 0 }, { unit1: 0 }];
		expect(peakOutput(rows, ['unit1'])).toBe(0);
	});

	it('converts energy to power when intervalHours is provided', () => {
		// 120 MWh in a 24-hour interval = 5 MW peak
		const rows = [
			{ unit1: 50, unit2: 30 }, // 80 MWh → 80/24 = 3.33 MW
			{ unit1: 80, unit2: 40 }, // 120 MWh → 120/24 = 5 MW
			{ unit1: 60, unit2: 20 } // 80 MWh → 80/24 = 3.33 MW
		];
		expect(peakOutput(rows, ['unit1', 'unit2'], 24)).toBe(5);
	});

	it('does not convert when intervalHours is 0 (default)', () => {
		const rows = [{ unit1: 120 }];
		expect(peakOutput(rows, ['unit1'], 0)).toBe(120);
	});

	it('converts correctly for 5-minute intervals', () => {
		// 10 MWh in 5 minutes (1/12 hour) = 120 MW
		const rows = [{ unit1: 10 }];
		expect(peakOutput(rows, ['unit1'], 5 / 60)).toBeCloseTo(120);
	});
});

// ── totalEmissions ───────────────────────────────────────────────────

describe('totalEmissions', () => {
	it('multiplies energy by per-unit emissions factor', () => {
		const data = [
			{ energy_UNIT1: 100, energy_UNIT2: 200 },
			{ energy_UNIT1: 100, energy_UNIT2: 200 }
		];
		// UNIT1: 200 MWh × 0.9 = 180 tCO2
		// UNIT2: 400 MWh × 1.2 = 480 tCO2
		const factors = { UNIT1: 0.9, UNIT2: 1.2 };
		expect(totalEmissions(data, ['energy_UNIT1', 'energy_UNIT2'], factors)).toBe(660);
	});

	it('skips units without emissions factors', () => {
		const data = [{ energy_UNIT1: 100 }];
		expect(totalEmissions(data, ['energy_UNIT1'], {})).toBe(0);
	});

	it('skips units with zero emissions factor', () => {
		const data = [{ energy_UNIT1: 100 }];
		expect(totalEmissions(data, ['energy_UNIT1'], { UNIT1: 0 })).toBe(0);
	});
});

// ── runningHours ─────────────────────────────────────────────────────

describe('runningHours', () => {
	it('counts intervals with power > 0 and converts to hours', () => {
		const data = [
			{ power: 100 },
			{ power: 0 },
			{ power: 50 },
			{ power: 0 },
			{ power: 200 },
			{ power: 150 }
		];
		// 4 intervals generating × 5 min / 60 = 0.333... hours
		expect(runningHours(data, ['power'], 5)).toBeCloseTo(4 * 5 / 60);
	});

	it('returns 0 when no power generated', () => {
		const data = [{ power: 0 }, { power: 0 }];
		expect(runningHours(data, ['power'], 5)).toBe(0);
	});

	it('counts across multiple series', () => {
		const data = [
			{ u1: 0, u2: 10 }, // generating (u2 > 0)
			{ u1: 0, u2: 0 }, // not generating
			{ u1: 5, u2: 0 } // generating (u1 > 0)
		];
		// 2 intervals × 30 min / 60 = 1 hour
		expect(runningHours(data, ['u1', 'u2'], 30)).toBe(1);
	});

	it('returns 0 for empty data', () => {
		expect(runningHours([], ['power'], 5)).toBe(0);
	});
});

// ── startCount ───────────────────────────────────────────────────────

describe('startCount', () => {
	it('counts transitions from 0 to generating', () => {
		const data = [
			{ power: 0 },
			{ power: 100 }, // start 1
			{ power: 150 },
			{ power: 0 },
			{ power: 50 }, // start 2
			{ power: 0 },
			{ power: 200 } // start 3
		];
		expect(startCount(data, ['power'])).toBe(3);
	});

	it('counts initial generating as a start', () => {
		const data = [{ power: 100 }, { power: 0 }, { power: 50 }];
		expect(startCount(data, ['power'])).toBe(2);
	});

	it('returns 0 when never generating', () => {
		const data = [{ power: 0 }, { power: 0 }];
		expect(startCount(data, ['power'])).toBe(0);
	});

	it('returns 1 for continuous generation', () => {
		const data = [{ power: 100 }, { power: 150 }, { power: 200 }];
		expect(startCount(data, ['power'])).toBe(1);
	});

	it('returns 0 for empty data', () => {
		expect(startCount([], ['power'])).toBe(0);
	});
});

// ── batteryMetrics ───────────────────────────────────────────────────

describe('batteryMetrics', () => {
	const makeData = () => {
		const energyData = [
			{ discharge: 100, charge: -80 },
			{ discharge: 100, charge: -80 }
		];
		const mvData = [
			{ mv_discharge: 8000, mv_charge: -4000 },
			{ mv_discharge: 8000, mv_charge: -4000 }
		];
		return {
			energyData,
			mvData,
			generatorSeriesNames: ['discharge'],
			loadSeriesNames: ['charge'],
			mvGeneratorNames: ['mv_discharge'],
			mvLoadNames: ['mv_charge'],
			storageCapacity: 200, // MWh
			powerCapacity: 100, // MW
			hoursInRange: 48 // 2 days
		};
	};

	it('calculates net revenue', () => {
		const result = batteryMetrics(makeData());
		// dischargeMV = 16000, chargeMV = 8000, net = 8000
		expect(result.netRevenue).toBe(8000);
	});

	it('calculates average spread', () => {
		const result = batteryMetrics(makeData());
		// avgDischargePrice = 16000/200 = 80, avgChargePrice = 8000/160 = 50
		expect(result.avgSpread).toBe(80 - 50);
	});

	it('calculates cycles per day', () => {
		const result = batteryMetrics(makeData());
		// dischargeEnergy = 200, storageCapacity = 200, days = 2
		// cycles = 200 / 200 / 2 = 0.5
		expect(result.cyclesPerDay).toBe(0.5);
	});

	it('calculates storage duration', () => {
		const result = batteryMetrics(makeData());
		// 200 MWh / 100 MW = 2 hours
		expect(result.storageDuration).toBe(2);
	});

	it('calculates round-trip efficiency', () => {
		const result = batteryMetrics(makeData());
		// discharge = 200, charge = 160, efficiency = 200/160 * 100 = 125%
		expect(result.roundTripEfficiency).toBe(125);
	});

	it('handles zero storage capacity', () => {
		const data = makeData();
		data.storageCapacity = 0;
		const result = batteryMetrics(data);
		expect(result.cyclesPerDay).toBe(0);
	});

	it('handles zero power capacity', () => {
		const data = makeData();
		data.powerCapacity = 0;
		const result = batteryMetrics(data);
		expect(result.storageDuration).toBe(0);
	});

	it('handles zero charge energy', () => {
		const data = makeData();
		data.loadSeriesNames = [];
		const result = batteryMetrics(data);
		expect(result.roundTripEfficiency).toBe(0);
	});
});

// ── dcAcRatio ────────────────────────────────────────────────────────

describe('dcAcRatio', () => {
	it('calculates DC:AC ratio', () => {
		// 588 DC / 450 AC = 1.3066...
		expect(dcAcRatio(588, 450)).toBeCloseTo(1.307, 2);
	});

	it('returns null when ratio is too low (< 1.05)', () => {
		// 100 DC / 100 AC = 1.0
		expect(dcAcRatio(100, 100)).toBeNull();
	});

	it('returns null when ratio is too high (> 3)', () => {
		expect(dcAcRatio(400, 100)).toBeNull();
	});

	it('returns null when capacityRegistered is 0', () => {
		expect(dcAcRatio(0, 100)).toBeNull();
	});

	it('returns null when capacityMaximum is 0', () => {
		expect(dcAcRatio(100, 0)).toBeNull();
	});

	it('returns null for falsy inputs', () => {
		expect(dcAcRatio(null, 100)).toBeNull();
		expect(dcAcRatio(100, null)).toBeNull();
		expect(dcAcRatio(undefined, undefined)).toBeNull();
	});

	it('accepts typical solar oversizing ratios', () => {
		expect(dcAcRatio(130, 100)).toBeCloseTo(1.3, 1);
		expect(dcAcRatio(140, 100)).toBeCloseTo(1.4, 1);
	});
});
