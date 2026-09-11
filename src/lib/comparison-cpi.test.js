import { describe, it, expect } from 'vitest';
import { parseComparisonCpi, adjustComparisonInflation } from './comparison-cpi.js';
const payload = {
	data: [
		{
			type: 'cpi',
			history: { start: '2024-03-01T10:00:00+10:00', interval: '1Q', data: [100, 120] }
		}
	]
};
describe('comparison CPI', () => {
	it('maps quarter-end labels to the correct three monthly observations', () => {
		const cpi = parseComparisonCpi(payload);
		expect(cpi.reference).toBe('June 2024');
		expect(cpi.values[0].time).toBe(Date.UTC(2024, 0));
		const rows = adjustComparisonInflation(
			[0, 2, 3, 5, 6].map((month) => ({ time: Date.UTC(2024, month), market_value: 100 })),
			cpi
		);
		expect(rows.map((row) => row.market_value_real)).toEqual([120, 120, 100, 100, null]);
	});
	it('does not replace missing or failed CPI with nominal prices', () => {
		expect(() => parseComparisonCpi({ data: [] })).toThrow('CPI');
		expect(
			adjustComparisonInflation([{ time: 0, market_value: 100 }], null)[0].market_value_real
		).toBeNull();
	});
});
