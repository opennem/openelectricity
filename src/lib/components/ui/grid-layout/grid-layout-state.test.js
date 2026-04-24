import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	normalizeLayout,
	migrateColumns,
	moveItem,
	applyDndReorder,
	loadLayout,
	saveLayout
} from './grid-layout-state.js';

describe('normalizeLayout', () => {
	it('distributes ids into column 0 when stored is null', () => {
		const result = normalizeLayout(null, ['a', 'b', 'c'], 1);
		expect(result).toEqual({ columns: [['a', 'b', 'c']] });
	});

	it('distributes ids across columns when stored is null and columnCount > 1', () => {
		const result = normalizeLayout(null, ['a', 'b', 'c'], 2);
		expect(result).toEqual({ columns: [['a', 'b'], ['c']] });
	});

	it('treats undefined stored as empty', () => {
		const result = normalizeLayout(undefined, ['a'], 1);
		expect(result).toEqual({ columns: [['a']] });
	});

	it('filters out ids no longer available', () => {
		const stored = { columns: [['a', 'stale'], ['b']] };
		const result = normalizeLayout(stored, ['a', 'b'], 2);
		expect(result).toEqual({ columns: [['a'], ['b']] });
	});

	it('appends new ids to the last column, preserving availableIds order', () => {
		const stored = { columns: [['a'], ['b']] };
		const result = normalizeLayout(stored, ['a', 'b', 'c', 'd'], 2);
		expect(result).toEqual({ columns: [['a'], ['b', 'c', 'd']] });
	});

	it('appends new ids to the single column when column count is 1', () => {
		const stored = { columns: [['a']] };
		const result = normalizeLayout(stored, ['a', 'b'], 1);
		expect(result).toEqual({ columns: [['a', 'b']] });
	});

	it('migrates 2→1 by concatenating in order', () => {
		const stored = { columns: [['a', 'b'], ['c']] };
		const result = normalizeLayout(stored, ['a', 'b', 'c'], 1);
		expect(result).toEqual({ columns: [['a', 'b', 'c']] });
	});

	it('migrates 1→2 by splitting with earlier columns getting extras', () => {
		const stored = { columns: [['a', 'b', 'c']] };
		const result = normalizeLayout(stored, ['a', 'b', 'c'], 2);
		expect(result).toEqual({ columns: [['a', 'b'], ['c']] });
	});

	it('ignores non-string column entries defensively', () => {
		const stored = /** @type {any} */ ({ columns: [['a', 42, null], ['b']] });
		const result = normalizeLayout(stored, ['a', 'b'], 2);
		expect(result).toEqual({ columns: [['a'], ['b']] });
	});

	it('never duplicates an id after normalising', () => {
		const stored = { columns: [['a', 'b']] };
		const result = normalizeLayout(stored, ['a', 'b'], 1);
		const flat = result.columns.flat();
		expect(flat).toEqual(['a', 'b']);
		expect(new Set(flat).size).toBe(flat.length);
	});

	it('coerces columnCount < 1 to a single column', () => {
		const result = normalizeLayout(null, ['a', 'b'], 0);
		expect(result).toEqual({ columns: [['a', 'b']] });
	});
});

describe('migrateColumns', () => {
	it('returns an equivalent clone when counts match', () => {
		const layout = { columns: [['a'], ['b']] };
		const result = migrateColumns(layout, 2);
		expect(result).toEqual(layout);
		expect(result).not.toBe(layout);
		expect(result.columns[0]).not.toBe(layout.columns[0]);
	});

	it('concatenates 2→1 preserving order', () => {
		const result = migrateColumns(
			{
				columns: [
					['a', 'b'],
					['c', 'd']
				]
			},
			1
		);
		expect(result).toEqual({ columns: [['a', 'b', 'c', 'd']] });
	});

	it('splits 1→2 — odd length, col 0 gets the extra', () => {
		const result = migrateColumns({ columns: [['a', 'b', 'c']] }, 2);
		expect(result).toEqual({ columns: [['a', 'b'], ['c']] });
	});

	it('splits 1→2 — even length, exactly half', () => {
		const result = migrateColumns({ columns: [['a', 'b', 'c', 'd']] }, 2);
		expect(result).toEqual({
			columns: [
				['a', 'b'],
				['c', 'd']
			]
		});
	});

	it('clamps a zero column count up to 1', () => {
		const result = migrateColumns({ columns: [['a'], ['b']] }, 0);
		expect(result).toEqual({ columns: [['a', 'b']] });
	});
});

describe('moveItem', () => {
	it('moves within the same column', () => {
		const layout = { columns: [['a', 'b', 'c']] };
		const result = moveItem(layout, 'c', 0, 0);
		expect(result).toEqual({ columns: [['c', 'a', 'b']] });
	});

	it('moves across columns', () => {
		const layout = { columns: [['a', 'b'], ['c']] };
		const result = moveItem(layout, 'a', 1, 0);
		expect(result).toEqual({ columns: [['b'], ['a', 'c']] });
	});

	it('clamps toIndex to destination column length', () => {
		const layout = { columns: [['a'], ['b']] };
		const result = moveItem(layout, 'a', 1, 99);
		expect(result).toEqual({ columns: [[], ['b', 'a']] });
	});

	it('clamps toColumn to the valid range', () => {
		const layout = { columns: [['a'], ['b']] };
		const result = moveItem(layout, 'a', 99, 0);
		expect(result).toEqual({ columns: [[], ['a', 'b']] });
	});

	it('is a no-op for unknown ids (but returns a clone)', () => {
		const layout = { columns: [['a']] };
		const result = moveItem(layout, 'unknown', 0, 0);
		expect(result).toEqual(layout);
		expect(result).not.toBe(layout);
	});

	it('does not mutate the input', () => {
		const layout = { columns: [['a', 'b']] };
		moveItem(layout, 'a', 0, 1);
		expect(layout).toEqual({ columns: [['a', 'b']] });
	});

	it('handles moving an item to its current position cleanly', () => {
		const layout = { columns: [['a', 'b', 'c']] };
		const result = moveItem(layout, 'b', 0, 1);
		expect(result).toEqual({ columns: [['a', 'b', 'c']] });
	});
});

describe('applyDndReorder', () => {
	it('replaces the target column contents', () => {
		const layout = { columns: [['a', 'b'], ['c']] };
		const result = applyDndReorder(layout, 0, ['b', 'a']);
		expect(result).toEqual({ columns: [['b', 'a'], ['c']] });
	});

	it('leaves the other column untouched', () => {
		const layout = { columns: [['a'], ['b', 'c']] };
		const result = applyDndReorder(layout, 1, ['c', 'b']);
		expect(result.columns[0]).toEqual(['a']);
		expect(result.columns[1]).toEqual(['c', 'b']);
	});

	it('accepts cross-column results (item moved into a new column)', () => {
		const layout = { columns: [['a', 'b'], ['c']] };
		const result = applyDndReorder(layout, 1, ['a', 'c']);
		expect(result.columns[1]).toEqual(['a', 'c']);
	});

	it('returns a clone when the column index is out of range', () => {
		const layout = { columns: [['a']] };
		const result = applyDndReorder(layout, 5, ['x']);
		expect(result).toEqual(layout);
		expect(result).not.toBe(layout);
	});

	it('does not mutate the input', () => {
		const layout = { columns: [['a', 'b']] };
		applyDndReorder(layout, 0, ['b', 'a']);
		expect(layout).toEqual({ columns: [['a', 'b']] });
	});
});

describe('loadLayout / saveLayout', () => {
	/** @type {Record<string, string>} */
	let store;

	beforeEach(() => {
		store = {};
		const fakeStorage = {
			getItem: (/** @type {string} */ k) => (k in store ? store[k] : null),
			setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
				store[k] = String(v);
			},
			removeItem: (/** @type {string} */ k) => {
				delete store[k];
			},
			clear: () => {
				store = {};
			},
			key: () => null,
			length: 0
		};
		vi.stubGlobal('window', { localStorage: fakeStorage });
	});

	it('round-trips a layout', () => {
		const layout = { columns: [['a'], ['b', 'c']] };
		saveLayout('k', layout);
		expect(loadLayout('k')).toEqual(layout);
	});

	it('returns null for missing keys', () => {
		expect(loadLayout('nothing')).toBeNull();
	});

	it('returns null for corrupted JSON', () => {
		store['broken'] = '{not json';
		expect(loadLayout('broken')).toBeNull();
	});

	it('returns null when the stored value is the wrong shape', () => {
		store['wrong'] = JSON.stringify({ notColumns: true });
		expect(loadLayout('wrong')).toBeNull();
	});

	it('filters non-string entries out of loaded columns', () => {
		store['mixed'] = JSON.stringify({ columns: [['a', 1, null, 'b']] });
		expect(loadLayout('mixed')).toEqual({ columns: [['a', 'b']] });
	});

	it('loadLayout is a no-op (returns null) when window is undefined', () => {
		vi.stubGlobal('window', undefined);
		expect(loadLayout('k')).toBeNull();
	});

	it('saveLayout is a no-op (does not throw) when window is undefined', () => {
		vi.stubGlobal('window', undefined);
		expect(() => saveLayout('k', { columns: [['a']] })).not.toThrow();
	});

	it('saveLayout swallows localStorage errors (e.g. quota)', () => {
		vi.stubGlobal('window', {
			localStorage: {
				setItem: () => {
					throw new Error('QuotaExceeded');
				},
				getItem: () => null
			}
		});
		expect(() => saveLayout('k', { columns: [['a']] })).not.toThrow();
	});
});
