import { describe, expect, it } from 'vitest';
import { interpolateRooftopPower } from './rooftop-interpolation.js';
import { processNetworkData } from './process-network-data.js';
import { getGroup } from './groups.js';

const START = Date.parse('2026-09-07T10:00:00+10:00');
const STEP = 300_000;

function source(values = [100, 100, 100, 100, 100, 100, 160]) {
	return {
		groupFuelTechs: { solar_rooftop: ['solar_rooftop'] },
		data: values.map((value, index) => ({
			time: START + index * STEP,
			solar_rooftop: value,
			_rooftopPower: /** @type {number | null | undefined} */ (value),
			wind: index * 10,
			battery_charging: -20
		}))
	};
}

describe('display-only rooftop interpolation', () => {
	it('joins half-hour anchors linearly without mutating reported rows or other technologies', () => {
		const raw = source();
		const before = structuredClone(raw);
		const result = interpolateRooftopPower(raw);
		expect(result.data.map((row) => row.solar_rooftop)).toEqual([
			100, 110, 120, 130, 140, 150, 160
		]);
		expect(raw).toEqual(before);
		expect(result.data.map((row) => row.wind)).toEqual(raw.data.map((row) => row.wind));
		expect(result.data.every((row) => row.battery_charging === -20)).toBe(true);
		expect(result.data[0]).toBe(raw.data[0]);
		expect(result.data[6]).toBe(raw.data[6]);
	});

	it('handles descending values and sunrise, leaving all-zero nighttime blocks alone', () => {
		expect(
			interpolateRooftopPower(source([60, 60, 60, 60, 60, 60, 0])).data.map(
				(row) => row.solar_rooftop
			)
		).toEqual([60, 50, 40, 30, 20, 10, 0]);
		expect(
			interpolateRooftopPower(source([0, 0, 0, 0, 0, 0, 60])).data.map((row) => row.solar_rooftop)
		).toEqual([0, 10, 20, 30, 40, 50, 60]);
		const night = source(Array(13).fill(0));
		expect(interpolateRooftopPower(night)).toBe(night);
	});

	it('does not extrapolate at either cache edge', () => {
		const raw = source(Array(12).fill(100));
		raw.data.splice(0, 1);
		expect(interpolateRooftopPower(raw)).toBe(raw);
		const tail = source([100, 100, 100, 100, 100, 100, 160, 160, 160]);
		expect(interpolateRooftopPower(tail).data.slice(6)).toEqual(tail.data.slice(6));
	});

	it('does not bridge missing timestamps or missing/non-finite values', () => {
		const missing = source();
		missing.data.splice(3, 1);
		expect(interpolateRooftopPower(missing)).toBe(missing);
		for (const value of [null, undefined, NaN, Infinity, -1]) {
			for (const index of [0, 3, 6]) {
				const raw = source();
				raw.data[index]._rooftopPower = value;
				expect(interpolateRooftopPower(raw)).toBe(raw);
			}
		}
	});

	it('leaves genuine five-minute variation untouched', () => {
		const raw = source([100, 101, 102, 103, 104, 105, 160]);
		expect(interpolateRooftopPower(raw)).toBe(raw);
	});

	it('is independent of the later viewport slice', () => {
		const raw = source();
		const full = interpolateRooftopPower(raw);
		expect(
			full.data.filter((row) => row.time >= START + 3 * STEP).map((row) => row.solar_rooftop)
		).toEqual([130, 140, 150, 160]);
	});

	it('retains the rooftop component before grouping and only changes that component', () => {
		const group = getGroup('simple');
		const raw = source();
		const response = {
			data: [
				{
					metric: 'power',
					results: [
						{
							columns: { fueltech: 'solar_rooftop' },
							data: raw.data.map((row) => [
								new Date(row.time + 10 * 3_600_000).toISOString().replace('Z', '+10:00'),
								row.solar_rooftop
							])
						},
						{
							columns: { fueltech: 'solar_utility' },
							data: raw.data.map((row, index) => [
								new Date(row.time + 10 * 3_600_000).toISOString().replace('Z', '+10:00'),
								200 + index
							])
						}
					]
				}
			]
		};
		const config = {
			groupMap: group.fuelTechs,
			groupOrder: group.order,
			groupLabels: group.labels,
			getColour: () => '#fff',
			retainRooftopPower: true
		};
		const processed = processNetworkData(response, config);
		if (!processed) throw new Error('Expected grouped power data');
		expect(processed.data.map((row) => row.solar)).toEqual([300, 301, 302, 303, 304, 305, 366]);
		expect(interpolateRooftopPower(processed).data.map((row) => row.solar)).toEqual([
			300, 311, 322, 333, 344, 355, 366
		]);
		expect(processed.seriesNames).toEqual(['solar']);
		expect(
			processNetworkData(response, { ...config, retainRooftopPower: false })?.data[0]
		).not.toHaveProperty('_rooftopPower');
		const energy = { data: response.data.map((metric) => ({ ...metric, metric: 'energy' })) };
		expect(
			processNetworkData(energy, { ...config, metricFilter: 'energy' })?.data[0]
		).not.toHaveProperty('_rooftopPower');
	});
});
