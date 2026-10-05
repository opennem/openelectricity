import { describe, expect, it } from 'vitest';
import { columnFocusFor, valueCellEdges } from './table-styles.js';

describe('table value-column focus', () => {
	it('outlines a focused column, and adjacent focused columns as one block', () => {
		expect(columnFocusFor(['a', 'b', 'c'], ['b'])).toEqual([
			{ focused: false, left: false, right: false },
			{ focused: true, left: true, right: true },
			{ focused: false, left: false, right: false }
		]);
		expect(columnFocusFor(['p10', 'p90', 'mean'], ['p10', 'p90'])).toEqual([
			{ focused: true, left: true, right: false },
			{ focused: true, left: false, right: true },
			{ focused: false, left: false, right: false }
		]);
		expect(columnFocusFor(['a'], [])).toEqual([{ focused: false, left: false, right: false }]);
	});
	it('closes a focused column under the last row and a focused row beside the last column', () => {
		const column = { focused: true, left: true, right: true };
		const none = { focused: false, left: false, right: false };
		expect(valueCellEdges(false, column, { last: false, lastRow: true })).toContain('0 -1px');
		expect(valueCellEdges(false, column, { last: false, lastRow: false })).not.toContain('0 -1px');
		expect(valueCellEdges(true, none, { last: true, lastRow: false })).toContain('-1px 0');
		expect(valueCellEdges(false, none, { last: true, lastRow: true })).toBeUndefined();
	});
});
