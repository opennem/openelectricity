import { describe, it, expect } from 'vitest';
import { chartXHighlightTicks } from './chart-ticks.js';
import {
	AEMO_2018_ISP,
	AEMO_2020_ISP,
	AEMO_2020_ISP_DRAFT,
	AEMO_2022_ISP,
	AEMO_2022_ISP_DRAFT,
	AEMO_2024_ISP,
	AEMO_2024_ISP_DRAFT,
	AEMO_2026_ISP_DRAFT
} from './models.js';

describe('chartXHighlightTicks', () => {
	/** Expected projection start FY year for each model (after +1 year FY shift) */
	const expectedFyYears = {
		[AEMO_2026_ISP_DRAFT]: 2027,
		[AEMO_2024_ISP]: 2025,
		[AEMO_2024_ISP_DRAFT]: 2025,
		[AEMO_2022_ISP]: 2024,
		[AEMO_2022_ISP_DRAFT]: 2024,
		[AEMO_2020_ISP]: 2022,
		[AEMO_2020_ISP_DRAFT]: 2022,
		[AEMO_2018_ISP]: 2019
	};

	for (const [model, expectedYear] of Object.entries(expectedFyYears)) {
		it(`${model} highlight tick includes Jan 1 ${expectedYear}`, () => {
			const ticks = chartXHighlightTicks[model];
			const match = ticks.find((d) => d.getFullYear() === expectedYear);
			expect(match).toBeInstanceOf(Date);
			expect(match.getMonth()).toBe(0);
			expect(match.getDate()).toBe(1);
		});
	}

	it('2026 ISP draft has highlight tick at FY24/25 for last historical data', () => {
		const ticks = chartXHighlightTicks[AEMO_2026_ISP_DRAFT];
		expect(ticks).toHaveLength(2);
		const fy2425 = ticks.find((d) => d.getFullYear() === 2025);
		expect(fy2425).toBeInstanceOf(Date);
		expect(fy2425.getMonth()).toBe(0);
		expect(fy2425.getDate()).toBe(1);
	});
});
