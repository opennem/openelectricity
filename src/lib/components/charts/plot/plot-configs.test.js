import { describe, it, expect } from 'vitest';
import {
	toLong,
	colourScale,
	createStackedAreaOptions,
	createLineOptions,
	createStackedBarOptions,
	createGroupedBarOptions,
	createDotOptions,
	globalTypeToMarkType,
	createMixedMarkOptions
} from './plot-configs.js';

const CATEGORY_DATA = [
	{ category: 'A', solar: 10, wind: 20 },
	{ category: 'B', solar: 30, wind: 40 }
];
const SERIES = ['solar', 'wind'];
const COLOURS = { solar: '#f00', wind: '#00f' };
const LABELS = { solar: 'Solar', wind: 'Wind' };

// ── toLong ──────────────────────────────────────────────────────

describe('toLong', () => {
	it('pivots wide-format to long-format', () => {
		const result = toLong(CATEGORY_DATA, SERIES, 'category');
		expect(result).toEqual([
			{ x: 'A', series: 'solar', value: 10 },
			{ x: 'A', series: 'wind', value: 20 },
			{ x: 'B', series: 'solar', value: 30 },
			{ x: 'B', series: 'wind', value: 40 }
		]);
	});

	it('skips null values', () => {
		const data = [{ category: 'A', solar: 10, wind: null }];
		const result = toLong(data, SERIES, 'category');
		expect(result).toEqual([{ x: 'A', series: 'solar', value: 10 }]);
	});
});

// ── colourScale ─────────────────────────────────────────────────

describe('colourScale', () => {
	it('builds domain, range, and tickFormat from inputs', () => {
		const result = colourScale(SERIES, COLOURS, LABELS);
		expect(result.domain).toEqual(SERIES);
		expect(result.range).toEqual(['#f00', '#00f']);
		expect(result.tickFormat('solar')).toBe('Solar');
		expect(result.tickFormat('unknown')).toBe('unknown');
	});
});

// ── createStackedBarOptions ─────────────────────────────────────

describe('createStackedBarOptions', () => {
	it('returns valid plot options without options arg', () => {
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS);
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('applies marginRight from options', () => {
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			marginRight: 80
		});
		expect(result.marginRight).toBe(80);
	});

	it('applies custom style from options', () => {
		const customStyle = { fontFamily: 'Arial', fontSize: '14px' };
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			style: customStyle
		});
		expect(result.style).toBe(customStyle);
	});

	it('applies yTickFormat from options', () => {
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			yTickFormat: '.0f'
		});
		expect(result.y.tickFormat).toBe('.0f');
	});

	it('includes extraMarks in marks array', () => {
		const extra = { type: 'ruleY' };
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			extraMarks: [extra]
		});
		expect(result.marks[0]).toBe(extra);
	});

	it('disables legend when legend: false', () => {
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			legend: false
		});
		expect(result.color.legend).toBe(false);
	});

	it('does not set marginRight when not provided', () => {
		const result = createStackedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {});
		expect(result.marginRight).toBeUndefined();
	});
});

// ── createGroupedBarOptions ─────────────────────────────────────

describe('createGroupedBarOptions', () => {
	it('returns valid plot options without options arg', () => {
		const result = createGroupedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS);
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.fx).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('applies marginRight from options', () => {
		const result = createGroupedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			marginRight: 60
		});
		expect(result.marginRight).toBe(60);
	});

	it('applies custom style from options', () => {
		const customStyle = { fontFamily: 'Arial' };
		const result = createGroupedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			style: customStyle
		});
		expect(result.style).toBe(customStyle);
	});

	it('includes extraMarks in marks array', () => {
		const extra = { type: 'ruleY' };
		const result = createGroupedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {
			extraMarks: [extra]
		});
		expect(result.marks[0]).toBe(extra);
	});

	it('does not set marginRight when not provided', () => {
		const result = createGroupedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS, {});
		expect(result.marginRight).toBeUndefined();
	});
});

// ── createStackedAreaOptions ────────────────────────────────────

describe('createStackedAreaOptions', () => {
	const timeData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
		{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
	];

	it('applies marginRight from options', () => {
		const result = createStackedAreaOptions(timeData, SERIES, COLOURS, LABELS, {
			marginRight: 100
		});
		expect(result.marginRight).toBe(100);
	});
});

// ── createLineOptions ───────────────────────────────────────────

describe('createLineOptions', () => {
	const timeData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
		{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
	];

	it('applies marginRight from options', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS, {
			marginRight: 100
		});
		expect(result.marginRight).toBe(100);
	});
});

// ── createDotOptions ────────────────────────────────────────────

describe('createDotOptions', () => {
	const timeData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
		{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
	];

	it('returns valid plot options with dot marks', () => {
		const result = createDotOptions(timeData, SERIES, COLOURS, LABELS);
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('applies marginRight from options', () => {
		const result = createDotOptions(timeData, SERIES, COLOURS, LABELS, {
			marginRight: 80
		});
		expect(result.marginRight).toBe(80);
	});

	it('disables legend when legend: false', () => {
		const result = createDotOptions(timeData, SERIES, COLOURS, LABELS, { legend: false });
		expect(result.color.legend).toBe(false);
	});

	it('includes extraMarks in marks array', () => {
		const extra = { type: 'ruleY' };
		const result = createDotOptions(timeData, SERIES, COLOURS, LABELS, {
			extraMarks: [extra]
		});
		expect(result.marks[0]).toBe(extra);
	});
});

// ── globalTypeToMarkType ────────────────────────────────────────

describe('globalTypeToMarkType', () => {
	it('maps stacked-area to area', () => {
		expect(globalTypeToMarkType('stacked-area')).toBe('area');
	});

	it('maps area to area', () => {
		expect(globalTypeToMarkType('area')).toBe('area');
	});

	it('maps line to line', () => {
		expect(globalTypeToMarkType('line')).toBe('line');
	});

	it('maps bar-stacked to bar', () => {
		expect(globalTypeToMarkType('bar-stacked')).toBe('bar');
	});

	it('maps grouped-bar to bar', () => {
		expect(globalTypeToMarkType('grouped-bar')).toBe('bar');
	});

	it('maps dot to dot', () => {
		expect(globalTypeToMarkType('dot')).toBe('dot');
	});

	it('defaults to line for unknown types', () => {
		expect(globalTypeToMarkType('unknown')).toBe('line');
	});
});

// ── createMixedMarkOptions ──────────────────────────────────────

describe('createMixedMarkOptions', () => {
	const timeData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
		{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
	];

	const THREE_SERIES = ['solar', 'wind', 'coal'];
	const THREE_COLOURS = { solar: '#f00', wind: '#00f', coal: '#333' };
	const THREE_LABELS = { solar: 'Solar', wind: 'Wind', coal: 'Coal' };
	const threeSeriesData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20, coal: 30 },
		{ date: new Date('2024-01-02'), solar: 15, wind: 25, coal: 35 }
	];

	it('returns valid options with no per-series overrides', () => {
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{},
			'line'
		);
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('uses default mark type from global chartType when no overrides', () => {
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{},
			'stacked-area'
		);
		// Should have area mark + ruleY — at least 2 marks
		expect(result.marks.length).toBeGreaterThanOrEqual(2);
	});

	it('creates mixed marks when series have different types', () => {
		const result = createMixedMarkOptions(
			threeSeriesData,
			THREE_SERIES,
			THREE_COLOURS,
			THREE_LABELS,
			{ solar: 'line', wind: 'bar' },
			'area' // coal defaults to area
		);
		// Should have area (coal) + bar (wind) + line (solar) + ruleY = 4 marks
		expect(result.marks.length).toBe(4);
	});

	it('handles single series with override', () => {
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{ solar: 'dot' },
			'line' // wind defaults to line
		);
		// dot (solar) + line (wind) + ruleY = 3 marks
		expect(result.marks.length).toBe(3);
	});

	it('produces category-mode options when data has category key', () => {
		const result = createMixedMarkOptions(
			CATEGORY_DATA,
			SERIES,
			COLOURS,
			LABELS,
			{ solar: 'bar' },
			'bar-stacked' // wind defaults to bar
		);
		expect(result.x.type).toBe('band');
	});

	it('applies style and margin options', () => {
		const customStyle = { fontFamily: 'Arial' };
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{},
			'line',
			{ style: customStyle, marginRight: 50 }
		);
		expect(result.style).toBe(customStyle);
		expect(result.marginRight).toBe(50);
	});

	it('includes colour scale for all series', () => {
		const result = createMixedMarkOptions(
			threeSeriesData,
			THREE_SERIES,
			THREE_COLOURS,
			THREE_LABELS,
			{ solar: 'line', coal: 'dot' },
			'area'
		);
		expect(result.color.domain).toEqual(THREE_SERIES);
		expect(result.color.range).toEqual(['#f00', '#00f', '#333']);
	});

	it('includes extraMarks from options', () => {
		const extra = { type: 'ruleY' };
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{},
			'line',
			{ extraMarks: [extra] }
		);
		expect(result.marks).toContain(extra);
	});
});
