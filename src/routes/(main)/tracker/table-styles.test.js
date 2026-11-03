import { describe, expect, it } from 'vitest';
import {
	columnFocusFor,
	columnRule,
	valueCellClass,
	valueCellEdges,
	valueHeaderClass
} from './table-styles.js';

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

describe('table column rules', () => {
	const none = { focused: false, left: false, right: false };
	it('rules off every value column but the last, in headers and cells', () => {
		expect(columnRule(false)).toBe('border-r border-warm-grey');
		expect(columnRule(true)).toBe('');
		expect(valueHeaderClass(false, false)).toContain('border-r');
		expect(valueHeaderClass(true, false)).not.toContain('border-r');
		expect(valueCellClass('1', false, 'py-1.5', false, none)).toContain('border-r');
		expect(valueCellClass('1', true, 'py-1.5', false, none)).not.toContain('border-r');
	});
});
