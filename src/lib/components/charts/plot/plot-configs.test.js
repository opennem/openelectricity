import { describe, it, expect } from 'vitest';
import {
	toLong,
	colourScale,
	createStackedAreaOptions,
	createLineOptions,
	createStackedBarOptions,
	createGroupedBarOptions
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
