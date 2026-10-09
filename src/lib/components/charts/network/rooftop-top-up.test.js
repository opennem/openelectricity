import { describe, expect, it } from 'vitest';
import { topUpRooftopPower } from './rooftop-top-up.js';

const MIN = 60_000;
const T0 = Date.parse('2026-10-09T12:00:00+10:00');
const at = (/** @type {number} */ minutes) => T0 + minutes * MIN;

/** Detailed grouping: rooftop is its own series. */
const detailed = {
	groupFuelTechs: { solar_rooftop: ['solar_rooftop'], wind: ['wind'] },
	data: [
		{ time: at(0), solar_rooftop: 500, wind: 900, _rooftopPower: 500 },
		{ time: at(5), solar_rooftop: null, wind: 910, _rooftopPower: null },
		{ time: at(30), solar_rooftop: null, wind: 920, _rooftopPower: null },
		{ time: at(35), solar_rooftop: null, wind: 930, _rooftopPower: null }
	]
};
const forecast = [
	{ time: at(0), value: 520 },
	{ time: at(30), value: 540 },
	{ time: at(60), value: 560 }
];

describe('topUpRooftopPower', () => {
	it('fills rooftop after its latest reading from the covering half-hour slot', () => {
		const out = topUpRooftopPower(detailed, forecast);
		expect(out.data.map((row) => row.solar_rooftop)).toEqual([500, 520, 540, 540]);
		// Other series and the reported component are untouched.
		expect(out.data.map((row) => row.wind)).toEqual([900, 910, 920, 930]);
		expect(out.data[1]._rooftopPower).toBeNull();
	});

	it('never adds rows past the newest data', () => {
		expect(topUpRooftopPower(detailed, forecast).data).toHaveLength(4);
	});

	it('leaves the source cache and its rows unmutated', () => {
		const before = structuredClone(detailed);
		const out = topUpRooftopPower(detailed, forecast);
		expect(detailed).toEqual(before);
		expect(out).not.toBe(detailed);
	});

	it('adds only the missing rooftop part to a combined group', () => {
		const combined = {
			groupFuelTechs: { solar: ['solar_utility', 'solar_rooftop'] },
			data: [
				{ time: at(0), solar: 800, _rooftopPower: 500 },
				// Utility reported (300), rooftop not yet.
				{ time: at(5), solar: 300, _rooftopPower: null }
			]
		};
		expect(topUpRooftopPower(combined, forecast).data[1].solar).toBe(820);
	});

	it('leaves a row whose half-hour has no forecast slot as a gap', () => {
		const sparse = [{ time: at(-60), value: 400 }];
		expect(topUpRooftopPower(detailed, sparse)).toBe(detailed);
	});

	it('returns the source when there is nothing to fill', () => {
		const complete = {
			groupFuelTechs: detailed.groupFuelTechs,
			data: [{ time: at(0), solar_rooftop: 500, wind: 900, _rooftopPower: 500 }]
		};
		expect(topUpRooftopPower(complete, forecast)).toBe(complete);
		expect(topUpRooftopPower(detailed, [])).toBe(detailed);
		const noRooftop = { groupFuelTechs: { wind: ['wind'] }, data: detailed.data };
		expect(topUpRooftopPower(noRooftop, forecast)).toBe(noRooftop);
	});
});
