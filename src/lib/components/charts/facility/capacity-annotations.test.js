import { describe, it, expect } from 'vitest';
import { capacityAnnotations } from './capacity-annotations.js';

const base = {
	isEnergyMetric: false,
	showAnnotations: true,
	isProportion: false,
	isChangeSince: false,
	isLine: false,
	capacitySums: { positive: 100, negative: 0 },
	hasBatteryUnits: false
};

describe('capacityAnnotations', () => {
	it('returns nothing for energy charts, proportion mode, or when not requested', () => {
		const none = { yReferenceLines: [], yDomain: undefined };
		expect(capacityAnnotations({ ...base, isEnergyMetric: true })).toEqual(none);
		expect(capacityAnnotations({ ...base, isProportion: true })).toEqual(none);
		expect(capacityAnnotations({ ...base, showAnnotations: false })).toEqual(none);
	});

	it('pins a generation-only facility to [0, capacity × 1.15]', () => {
		const result = capacityAnnotations(base);
		expect(result.yReferenceLines).toEqual([
			{ value: 100, label: 'Generation Capacity', colour: 'var(--chart-1)' }
		]);
		expect(result.yDomain?.[0]).toBe(0);
		expect(result.yDomain?.[1]).toBeCloseTo(115);
	});

	it('adds a negative load line and domain for load capacity', () => {
		const result = capacityAnnotations({
			...base,
			capacitySums: { positive: 100, negative: 40 }
		});
		expect(result.yReferenceLines).toEqual([
			{ value: 100, label: 'Generation Capacity', colour: 'var(--chart-1)' },
			{ value: -40, label: 'Load Capacity', colour: 'var(--chart-1)' }
		]);
		expect(result.yDomain?.[0]).toBeCloseTo(-46);
		expect(result.yDomain?.[1]).toBeCloseTo(115);
	});

	it('keeps a symmetric domain for batteries with one-sided capacity', () => {
		const result = capacityAnnotations({
			...base,
			hasBatteryUnits: true,
			capacitySums: { positive: 100, negative: 0 }
		});
		expect(result.yDomain?.[0]).toBeCloseTo(-115);
		expect(result.yDomain?.[1]).toBeCloseTo(115);
	});

	it('uses a single Capacity line for line/change-since modes', () => {
		for (const flags of [{ isLine: true }, { isChangeSince: true }]) {
			const result = capacityAnnotations({
				...base,
				...flags,
				capacitySums: { positive: 60, negative: 80 }
			});
			expect(result.yReferenceLines).toEqual([
				{ value: 80, label: 'Capacity', colour: 'var(--chart-1)' }
			]);
			expect(result.yDomain).toEqual([0, 92]);
		}
	});

	it('returns nothing when a line-mode facility has no capacity', () => {
		const result = capacityAnnotations({
			...base,
			isLine: true,
			capacitySums: { positive: 0, negative: 0 }
		});
		expect(result).toEqual({ yReferenceLines: [], yDomain: undefined });
	});

	it('returns lines without a domain pin when both capacities are zero (stacked)', () => {
		const result = capacityAnnotations({
			...base,
			capacitySums: { positive: 0, negative: 0 }
		});
		expect(result.yReferenceLines).toEqual([]);
		expect(result.yDomain).toBeUndefined();
	});
});
