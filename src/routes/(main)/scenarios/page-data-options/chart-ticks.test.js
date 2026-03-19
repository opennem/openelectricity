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
		it(`${model} highlight tick is Jan 1 ${expectedYear}`, () => {
			const ticks = chartXHighlightTicks[model];
			expect(ticks).toHaveLength(1);

			const date = ticks[0];
			expect(date).toBeInstanceOf(Date);
			expect(date.getFullYear()).toBe(expectedYear);
			expect(date.getMonth()).toBe(0);
			expect(date.getDate()).toBe(1);
		});
	}
});
