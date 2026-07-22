import { describe, it, expect } from 'vitest';
import {
	getLeafValues,
	countSelectedLeaves,
	filterOptionsBySearch,
	getSelectedLabels,
	isDefaultSelection,
	activeLeafCount,
	serialiseSelection,
	parseSelection
} from './filter-options.js';
import {
	fuelTechOptions,
	regionOptions,
	statusOptions,
	typeOptions
} from '$lib/facilities/filters.js';

describe('getLeafValues', () => {
	it('returns children of parents plus childless top-level options', () => {
		const leaves = getLeafValues(regionOptions);
		expect(leaves).toEqual(['nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem', 'act', 'nt']);
	});

	it('never includes a parent value as a leaf (battery quirk: child reuses the value)', () => {
		const leaves = getLeafValues(fuelTechOptions);
		// 4 flat + battery(3) + gas(5) + bioenergy(2) + coal(2)
		expect(leaves).toHaveLength(16);
		// 'battery' appears exactly once — as the bidirectional child, not the parent
		expect(leaves.filter((v) => v === 'battery')).toHaveLength(1);
		expect(leaves).not.toContain('gas');
		expect(leaves).not.toContain('coal');
		expect(leaves).not.toContain('bioenergy');
	});

	it('returns all values for a flat list', () => {
		expect(getLeafValues(statusOptions)).toEqual([
			'committed',
			'commissioning',
			'operating',
			'retired'
		]);
	});
});

describe('countSelectedLeaves', () => {
	it('counts selected leaves across flat and nested options', () => {
		const selected = ['wind', 'gas_ccgt', 'gas_ocgt', 'coal_black'];
		expect(countSelectedLeaves(fuelTechOptions, selected)).toBe(4);
	});

	it('counts the battery bidirectional leaf when selected', () => {
		expect(countSelectedLeaves(fuelTechOptions, ['battery'])).toBe(1);
	});

	it('ignores values that are not leaves', () => {
		expect(countSelectedLeaves(fuelTechOptions, ['gas', 'nonsense'])).toBe(0);
	});

	it('returns 0 for an empty selection', () => {
		expect(countSelectedLeaves(regionOptions, [])).toBe(0);
	});
});

describe('filterOptionsBySearch', () => {
	it('returns the original options for a blank term', () => {
		expect(filterOptionsBySearch(fuelTechOptions, '')).toBe(fuelTechOptions);
		expect(filterOptionsBySearch(fuelTechOptions, '   ')).toBe(fuelTechOptions);
	});

	it('keeps a matching parent with all its children', () => {
		const result = filterOptionsBySearch(fuelTechOptions, 'gas');
		const gas = result.find((opt) => opt.value === 'gas');
		expect(gas?.children).toHaveLength(5);
	});

	it('prunes non-matching siblings when only a child matches', () => {
		const result = filterOptionsBySearch(fuelTechOptions, 'ocgt');
		expect(result).toHaveLength(1);
		expect(result[0].value).toBe('gas');
		expect(result[0].children).toHaveLength(1);
		expect(result[0].children?.[0].value).toBe('gas_ocgt');
	});

	it('removes parents with no matching children and non-matching flat options', () => {
		const result = filterOptionsBySearch(fuelTechOptions, 'wind');
		expect(result.map((opt) => opt.value)).toEqual(['wind']);
	});

	it('is case-insensitive', () => {
		const result = filterOptionsBySearch(fuelTechOptions, 'SOLAR');
		expect(result.map((opt) => opt.value)).toEqual(['solar_utility']);
	});

	it('does not mutate the source options', () => {
		filterOptionsBySearch(fuelTechOptions, 'ocgt');
		const gas = fuelTechOptions.find((opt) => opt.value === 'gas');
		expect(gas?.children).toHaveLength(5);
	});
});

describe('getSelectedLabels', () => {
	it('returns an empty list for no selection', () => {
		expect(getSelectedLabels(statusOptions, [])).toEqual([]);
	});

	it('lists labels in option order', () => {
		expect(getSelectedLabels(statusOptions, ['operating', 'committed'])).toEqual([
			'Committed',
			'Operating'
		]);
	});

	it('collects nested child labels', () => {
		expect(getSelectedLabels(regionOptions, ['nsw1', 'sa1', 'wem'])).toEqual([
			'New South Wales',
			'South Australia',
			'Western Australia'
		]);
	});

	it('applies labelMap overrides', () => {
		const labelMap = { nsw1: 'NSW', sa1: 'SA', wem: 'WA' };
		expect(getSelectedLabels(regionOptions, ['wem', 'sa1', 'nsw1'], { labelMap })).toEqual([
			'NSW',
			'SA',
			'WA'
		]);
	});
});

describe('three-level trees (merged Type filter)', () => {
	it('getLeafValues recurses through nested groups', () => {
		const leaves = getLeafValues(typeOptions);
		// Group values are never leaves at any depth
		expect(leaves).not.toContain('generators');
		expect(leaves).not.toContain('loads');
		expect(leaves).not.toContain('gas');
		// Sub-technology leaves two levels down survive
		expect(leaves).toContain('gas_ccgt');
		expect(leaves).toContain('wind');
		expect(leaves).toContain('data_centres');
	});

	it('countSelectedLeaves counts deep leaves', () => {
		expect(countSelectedLeaves(typeOptions, ['gas_ccgt', 'data_centres', 'generators'])).toBe(2);
	});

	it('filterOptionsBySearch keeps ancestors of a deep match and prunes siblings', () => {
		const filtered = filterOptionsBySearch(typeOptions, 'ccgt');
		expect(filtered).toHaveLength(1);
		expect(filtered[0].value).toBe('generators');
		const gas = filtered[0].children?.find((c) => c.value === 'gas');
		expect(gas).toBeDefined();
		expect(gas?.children?.every((c) => c.label.toLowerCase().includes('ccgt'))).toBe(true);
		// Non-matching groups (Loads) are pruned entirely
		expect(filtered[0].children?.some((c) => c.value === 'loads')).toBe(false);
	});

	it('getSelectedLabels resolves labels at any depth', () => {
		expect(getSelectedLabels(typeOptions, ['gas_ccgt', 'data_centres'])).toEqual([
			'Gas (CCGT)',
			'Data Centres'
		]);
	});
});

describe('isDefaultSelection', () => {
	it('is order-insensitive', () => {
		expect(isDefaultSelection(['b', 'a'], ['a', 'b'])).toBe(true);
	});

	it('rejects subsets, supersets and empty-vs-default', () => {
		expect(isDefaultSelection(['a'], ['a', 'b'])).toBe(false);
		expect(isDefaultSelection(['a', 'b', 'c'], ['a', 'b'])).toBe(false);
		expect(isDefaultSelection([], ['a', 'b'])).toBe(false);
	});
});

describe('activeLeafCount', () => {
	it('returns 0 at the default selection', () => {
		expect(
			activeLeafCount(statusOptions, ['operating', 'commissioning'], ['operating', 'commissioning'])
		).toBe(0);
	});

	it('counts selected leaves when deviating', () => {
		expect(activeLeafCount(statusOptions, ['operating'], ['operating', 'commissioning'])).toBe(1);
	});

	it('counts an empty (nothing-shown) selection as 1', () => {
		expect(activeLeafCount(statusOptions, [], ['operating', 'commissioning'])).toBe(1);
	});
});

describe('serialiseSelection / parseSelection round-trip', () => {
	const DEFAULTS = ['operating', 'commissioning'];

	it('omits the default selection and parses the omission back to it', () => {
		expect(serialiseSelection(['commissioning', 'operating'], DEFAULTS)).toBe(null);
		expect(parseSelection(null, DEFAULTS)).toEqual(DEFAULTS);
	});

	it("serialises an empty selection as 'none' and parses it back to empty", () => {
		expect(serialiseSelection([], DEFAULTS)).toBe('none');
		expect(parseSelection('none', DEFAULTS)).toEqual([]);
	});

	it('round-trips a subset', () => {
		const serialised = serialiseSelection(['retired'], DEFAULTS);
		expect(serialised).toBe('retired');
		expect(parseSelection(serialised, DEFAULTS)).toEqual(['retired']);
	});
});
