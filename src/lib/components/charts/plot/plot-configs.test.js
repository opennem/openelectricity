// @ts-nocheck — assertions trust the shape returned by Plot configs;
// strict optional-chain checks would clutter every expectation.
import { describe, it, expect } from 'vitest';
import {
	toLong,
	colourScale,
	createStackedAreaOptions,
	createLineOptions,
	createScatterOptions,
	createStackedBarOptions,
	createGroupedBarOptions,
	createHorizontalBarOptions,
	createGroupedHorizontalBarOptions,
	createDotOptions,
	globalTypeToMarkType,
	createMixedMarkOptions,
	createColourGroupedBarOptions,
	buildTooltipChannels,
	buildFacetGrid,
	withFacetFields,
	buildScatterData
} from './plot-configs.js';
import { getLineDasharray } from '$lib/stratify/chart-types.js';

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

	it('attaches facet field when facetKey is provided', () => {
		const data = [
			{ region: 'NSW', category: 'A', solar: 10, wind: 20 },
			{ region: 'VIC', category: 'A', solar: 11, wind: 21 }
		];
		const result = toLong(data, SERIES, 'category', 'region');
		expect(result).toEqual([
			{ x: 'A', series: 'solar', value: 10, facet: 'NSW' },
			{ x: 'A', series: 'wind', value: 20, facet: 'NSW' },
			{ x: 'A', series: 'solar', value: 11, facet: 'VIC' },
			{ x: 'A', series: 'wind', value: 21, facet: 'VIC' }
		]);
	});

	it('omits facet field when facetKey is null', () => {
		const result = toLong(CATEGORY_DATA, SERIES, 'category', null);
		expect(result.every((row) => !('facet' in row))).toBe(true);
	});

	it('attaches _fx and _fy from facetGrid when provided', () => {
		const data = [
			{ region: 'NSW', category: 'A', solar: 10, wind: 20 },
			{ region: 'QLD', category: 'A', solar: 12, wind: 22 }
		];
		const grid = buildFacetGrid(['NSW', 'QLD', 'VIC', 'SA'], 2);
		const result = toLong(data, SERIES, 'category', 'region', grid);
		const nsw = result.find((r) => r.facet === 'NSW' && r.series === 'solar');
		const qld = result.find((r) => r.facet === 'QLD' && r.series === 'solar');
		expect(nsw._fx).toBe(0);
		expect(nsw._fy).toBe(0);
		expect(qld._fx).toBe(1);
		expect(qld._fy).toBe(0);
	});
});

describe('buildFacetGrid', () => {
	it('lays facets out left-to-right then wraps to next row', () => {
		const grid = buildFacetGrid(['A', 'B', 'C', 'D', 'E'], 3);
		expect(grid.cols).toBe(3);
		expect(grid.rows).toBe(2);
		expect(grid.indexByFacet.get('A')).toEqual({ col: 0, row: 0 });
		expect(grid.indexByFacet.get('B')).toEqual({ col: 1, row: 0 });
		expect(grid.indexByFacet.get('C')).toEqual({ col: 2, row: 0 });
		expect(grid.indexByFacet.get('D')).toEqual({ col: 0, row: 1 });
		expect(grid.indexByFacet.get('E')).toEqual({ col: 1, row: 1 });
	});

	it('clamps cols to at least 1', () => {
		const grid = buildFacetGrid(['A', 'B'], 0);
		expect(grid.cols).toBe(1);
		expect(grid.rows).toBe(2);
	});
});

describe('withFacetFields', () => {
	it('adds matching facet coordinates to wide-format tooltip rows', () => {
		const data = [
			{ hour: 10, Year: 2025, mean: 41.69 },
			{ hour: 10, Year: 2026, mean: 55.98 }
		];
		const grid = buildFacetGrid([2025, 2026], 2);

		expect(withFacetFields(data, 'Year', grid)).toEqual([
			{ hour: 10, Year: 2025, mean: 41.69, facet: 2025, _fx: 0, _fy: 0 },
			{ hour: 10, Year: 2026, mean: 55.98, facet: 2026, _fx: 1, _fy: 0 }
		]);
	});

	it('returns the original rows when the chart is not partitioned', () => {
		const data = [{ hour: 10, mean: 55.98 }];
		expect(withFacetFields(data)).toBe(data);
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

	it('keeps internal category grouping on fx when no facetColumn is set', () => {
		const result = createGroupedBarOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS);
		expect(result.fx).toBeDefined();
		expect(result.fy).toBeUndefined();
	});

	it('moves internal category grouping to fy when facetColumn is set', () => {
		const data = [
			{ region: 'NSW', category: 'A', solar: 10, wind: 20 },
			{ region: 'VIC', category: 'A', solar: 11, wind: 21 }
		];
		const result = createGroupedBarOptions(data, SERIES, COLOURS, LABELS, {
			facetColumn: 'region'
		});
		expect(result.fy).toBeDefined();
		// fx now belongs to the user's facet column
		expect(result.fx).toBeDefined();
		expect(result.fx.label).toBeNull();
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

	it('omits fx scale when facetColumn is not set', () => {
		const result = createStackedAreaOptions(timeData, SERIES, COLOURS, LABELS);
		expect(result.fx).toBeUndefined();
	});

	it('adds fx scale when facetColumn is set', () => {
		const result = createStackedAreaOptions(timeData, SERIES, COLOURS, LABELS, {
			facetColumn: 'region'
		});
		expect(result.fx).toBeDefined();
		expect(result.fx.label).toBeNull();
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

	it('produces valid options with category data', () => {
		const result = createLineOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS);
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('sets point x-scale type for category data', () => {
		const result = createLineOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS);
		expect(result.x.type).toBe('point');
	});

	it('does not override x-scale type for time-series data', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS);
		expect(result.x.type).toBeUndefined();
	});

	it('adds fx scale when facetColumn is set', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS, {
			facetColumn: 'region'
		});
		expect(result.fx).toBeDefined();
		expect(result.fx.label).toBeNull();
	});

	it('renders a min/max range band behind the line using the first series colour', () => {
		const data = [
			{ linear: 1, mean: 20, minimum: 10, maximum: 30 },
			{ linear: 2, mean: 25, minimum: 12, maximum: 36 }
		];
		const result = createLineOptions(
			data,
			['mean'],
			{ mean: '#123456' },
			{ mean: 'Mean' },
			{
				lineRangeMinColumn: 'minimum',
				lineRangeMaxColumn: 'maximum',
				lineRangeOpacity: 0.25,
				curve: 'monotone-x'
			}
		);

		expect(result.marks).toHaveLength(3);
		expect(result.marks[0]).toMatchObject({
			data,
			fill: '#123456',
			fillOpacity: 0.25
		});
		expect(result.marks[0].curve).toBeTypeOf('function');
	});

	it('routes the range band through the same facet channels as its line', () => {
		const data = [{ category: 'A', mean: 20, minimum: 10, maximum: 30, region: 'NSW' }];
		const grid = buildFacetGrid(['NSW'], 1);
		const result = createLineOptions(
			data,
			['mean'],
			{ mean: '#123456' },
			{ mean: 'Mean' },
			{
				lineRangeMinColumn: 'minimum',
				lineRangeMaxColumn: 'maximum',
				facetColumn: 'region',
				facetGrid: grid
			}
		);

		expect(result.marks[0].fx).toBe('_fx');
		expect(result.marks[0].fy).toBe('_fy');
		expect(result.marks[0].data[0]).toMatchObject({ _fx: 0, _fy: 0 });
	});
});

// ── Horizontal date axes ───────────────────────────────────────

describe('horizontal charts with temporal data', () => {
	const timeData = [
		{ date: new Date('2026-07-01T00:00:00Z'), solar: 10, wind: 20 },
		{ date: new Date('2026-07-02T00:00:00Z'), solar: 30, wind: 40 }
	];

	it('uses temporal values for stacked bar categories', () => {
		const result = createHorizontalBarOptions(timeData, SERIES, COLOURS, LABELS);
		expect(result.marks[0].data[0].x).toEqual(timeData[0].date);
	});

	it('uses temporal values for grouped bar domains', () => {
		const result = createGroupedHorizontalBarOptions(timeData, SERIES, COLOURS, LABELS);
		expect(result.fy.domain).toEqual(timeData.map((row) => row.date));
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

// ── createScatterOptions ────────────────────────────────────────

describe('createScatterOptions', () => {
	const linearData = [
		{ linear: 14, solar: 10, wind: 20, demand: 100 },
		{ linear: 20, solar: 30, wind: 40, demand: 225 },
		{ linear: 26, solar: 50, wind: 60, demand: 400 }
	];

	it('creates fixed-radius points for multiple series on a linear X scale', () => {
		const points = buildScatterData(linearData, SERIES, 'linear', { pointRadius: 5 });
		const result = createScatterOptions(linearData, SERIES, COLOURS, LABELS, {
			scatterPointRadius: 5,
			scatterPointOpacity: 0.35
		});

		expect(points).toHaveLength(6);
		expect(points.every((point) => point.radius === 5)).toBe(true);
		expect(points.map((point) => point.series)).toEqual([
			'solar',
			'wind',
			'solar',
			'wind',
			'solar',
			'wind'
		]);
		expect(result.x.type).toBe('linear');
		expect(result.r.type).toBe('identity');
		expect(result.color.domain).toEqual(SERIES);
		expect(result.marks[0].opacity).toBe(0.35);
	});

	it('colours scatter points by a row grouping column', () => {
		const data = [
			{ linear: 11.6, demand: 12.256, series: 2024 },
			{ linear: 10.3, demand: 13.127, series: 2025 }
		];
		const colours = { '2024': '#3347c7', '2025': '#267534' };
		const labels = { '2024': '2024', '2025': '2025' };
		const points = buildScatterData(data, ['demand'], 'linear', { colourSeries: 'series' });
		const result = createScatterOptions(data, ['demand'], colours, labels, {
			colourSeries: 'series',
			colourGroupNames: ['2024', '2025']
		});

		expect(points.map((point) => point.colourGroup)).toEqual(['2024', '2025']);
		expect(result.color.domain).toEqual(['2024', '2025']);
		expect(result.color.range).toEqual(['#3347c7', '#267534']);
	});

	it('square-root scales finite bubble values into the configured radius range', () => {
		const points = buildScatterData(linearData, ['solar'], 'linear', {
			sizeColumn: 'demand',
			minRadius: 3,
			maxRadius: 18
		});

		expect(points.map((point) => point.radius)).toEqual([3, 10.5, 18]);
		expect(points.map((point) => point.sizeValue)).toEqual([100, 225, 400]);
	});

	it('uses minimum radius for invalid sizes and fixed radius for a constant size column', () => {
		const invalid = buildScatterData(
			[
				{ category: 'A', solar: 1, size: 10 },
				{ category: 'B', solar: 2, size: null },
				{ category: 'C', solar: 3, size: 40 }
			],
			['solar'],
			'category',
			{ sizeColumn: 'size', pointRadius: 6, minRadius: 2, maxRadius: 12 }
		);
		const constant = buildScatterData(
			[
				{ category: 'A', solar: 1, size: 10 },
				{ category: 'B', solar: 2, size: 10 }
			],
			['solar'],
			'category',
			{ sizeColumn: 'size', pointRadius: 6, minRadius: 2, maxRadius: 12 }
		);

		expect(invalid.map((point) => point.radius)).toEqual([2, 2, 12]);
		expect(constant.map((point) => point.radius)).toEqual([6, 6]);
	});

	it('still gives invalid values the minimum radius beside a constant finite value', () => {
		const points = buildScatterData(
			[
				{ category: 'A', solar: 1, size: 10 },
				{ category: 'B', solar: 2, size: null }
			],
			['solar'],
			'category',
			{ sizeColumn: 'size', pointRadius: 6, minRadius: 2, maxRadius: 12 }
		);

		expect(points.map((point) => point.radius)).toEqual([6, 2]);
	});

	it('supports ordinal and temporal X modes', () => {
		const ordinal = createScatterOptions(CATEGORY_DATA, SERIES, COLOURS, LABELS);
		const temporal = createScatterOptions(
			[
				{ date: new Date('2024-01-01'), solar: 1 },
				{ date: new Date('2024-02-01'), solar: 2 }
			],
			['solar'],
			COLOURS,
			LABELS
		);

		expect(ordinal.x.type).toBe('point');
		expect(temporal.x.type).toBeUndefined();
	});

	it('carries facet and nearest-point tooltip fields on every long-format point', () => {
		const data = [
			{ linear: 1, solar: 10, wind: 20, demand: 100, region: 'NSW' },
			{ linear: 2, solar: 30, wind: 40, demand: 400, region: 'VIC' }
		];
		const grid = buildFacetGrid(['NSW', 'VIC'], 2);
		const points = buildScatterData(data, SERIES, 'linear', {
			sizeColumn: 'demand',
			facetColumn: 'region',
			facetGrid: grid
		});

		expect(points[0]).toMatchObject({
			x: 1,
			series: 'solar',
			value: 10,
			displayValue: 10,
			sizeValue: 100,
			facet: 'NSW',
			_fx: 0,
			_fy: 0,
			rowIndex: 0
		});
		expect(points[3]).toMatchObject({ facet: 'VIC', _fx: 1, _fy: 0 });
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

	it('maps top-level scatter to dot marks without changing legacy dot overrides', () => {
		expect(globalTypeToMarkType('scatter')).toBe('dot');
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
		const result = createMixedMarkOptions(timeData, SERIES, COLOURS, LABELS, {}, 'line');
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('uses default mark type from global chartType when no overrides', () => {
		const result = createMixedMarkOptions(timeData, SERIES, COLOURS, LABELS, {}, 'stacked-area');
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
		const result = createMixedMarkOptions(timeData, SERIES, COLOURS, LABELS, {}, 'line', {
			style: customStyle,
			marginRight: 50
		});
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
		const result = createMixedMarkOptions(timeData, SERIES, COLOURS, LABELS, {}, 'line', {
			extraMarks: [extra]
		});
		expect(result.marks).toContain(extra);
	});

	it('produces time-series bar marks when data has date key', () => {
		const timeData = [
			{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
			{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
		];
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{ solar: 'bar', wind: 'bar' },
			'line'
		);
		// bar marks + ruleY
		expect(result.marks.length).toBeGreaterThanOrEqual(2);
		// Should NOT have band x-axis (that's category mode)
		expect(result.x.type).toBeUndefined();
	});
});

// ── createColourGroupedBarOptions ───────────────────────────────

describe('createColourGroupedBarOptions', () => {
	const data = [
		{ category: 'NSW', capacity_factor: 0.3, market: 'NEM' },
		{ category: 'VIC', capacity_factor: 0.4, market: 'NEM' },
		{ category: 'WA', capacity_factor: 0.5, market: 'WEM' }
	];
	const groupNames = ['NEM', 'WEM'];
	const colours = { NEM: '#f00', WEM: '#00f' };
	const labels = { NEM: 'National', WEM: 'Western' };

	it('returns valid plot options', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market'
		);
		expect(result.style).toBeDefined();
		expect(result.color).toBeDefined();
		expect(result.marks.length).toBeGreaterThan(0);
		expect(result.x.type).toBe('band');
	});

	it('sets colour domain and range from group names', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market'
		);
		expect(result.color.domain).toEqual(['NEM', 'WEM']);
		expect(result.color.range).toEqual(['#f00', '#00f']);
	});

	it('applies tickFormat from labels', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market'
		);
		expect(result.color.tickFormat('NEM')).toBe('National');
		expect(result.color.tickFormat('WEM')).toBe('Western');
		expect(result.color.tickFormat('unknown')).toBe('unknown');
	});

	it('filters out rows with null value', () => {
		const dataWithNull = [
			{ category: 'NSW', capacity_factor: 0.3, market: 'NEM' },
			{ category: 'VIC', capacity_factor: null, market: 'NEM' }
		];
		const result = createColourGroupedBarOptions(
			dataWithNull,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market'
		);
		// Should still produce valid output without crashing
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('falls back to Unknown for missing colour series values', () => {
		const dataWithMissing = [{ category: 'NSW', capacity_factor: 0.3 }];
		const result = createColourGroupedBarOptions(
			dataWithMissing,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market'
		);
		// Should not crash
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('applies marginRight from options', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market',
			{ marginRight: 80 }
		);
		expect(result.marginRight).toBe(80);
	});

	it('does not set marginRight when not provided', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market'
		);
		expect(result.marginRight).toBeUndefined();
	});

	it('disables legend when legend: false', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market',
			{ legend: false }
		);
		expect(result.color.legend).toBe(false);
	});

	it('includes extraMarks in marks array', () => {
		const extra = { type: 'ruleY' };
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market',
			{ extraMarks: [extra] }
		);
		expect(result.marks[0]).toBe(extra);
	});

	it('applies yTickFormat from options', () => {
		const result = createColourGroupedBarOptions(
			data,
			'capacity_factor',
			groupNames,
			colours,
			labels,
			'market',
			{ yTickFormat: '.0%' }
		);
		expect(result.y.tickFormat).toBe('.0%');
	});
});

// ── buildTooltipChannels ────────────────────────────────────────

describe('buildTooltipChannels', () => {
	it('inverts labels to channels when all labels are unique', () => {
		const result = buildTooltipChannels({ solar: 'Solar', wind: 'Wind' });
		expect(result).toEqual({ Solar: 'solar', Wind: 'wind' });
	});

	it('disambiguates duplicate labels by appending the data key', () => {
		const result = buildTooltipChannels({ col_a: 'Value', col_b: 'Value' });
		expect(result).toEqual({
			'Value (col_a)': 'col_a',
			'Value (col_b)': 'col_b'
		});
	});

	it('only disambiguates colliding labels, leaves unique labels unchanged', () => {
		const result = buildTooltipChannels({
			solar: 'Solar',
			wind: 'Output',
			hydro: 'Output'
		});
		expect(result).toEqual({
			Solar: 'solar',
			'Output (wind)': 'wind',
			'Output (hydro)': 'hydro'
		});
	});

	it('handles a single entry', () => {
		const result = buildTooltipChannels({ price: 'Price' });
		expect(result).toEqual({ Price: 'price' });
	});

	it('handles empty input', () => {
		const result = buildTooltipChannels({});
		expect(result).toEqual({});
	});

	it('handles three-way duplicate labels', () => {
		const result = buildTooltipChannels({ a: 'X', b: 'X', c: 'X' });
		expect(result).toEqual({
			'X (a)': 'a',
			'X (b)': 'b',
			'X (c)': 'c'
		});
	});
});

// ── getLineDasharray ───────────────────────────────────────────

describe('getLineDasharray', () => {
	it('returns undefined for solid', () => {
		expect(getLineDasharray('solid')).toBeUndefined();
	});

	it('returns undefined for undefined input', () => {
		expect(getLineDasharray(undefined)).toBeUndefined();
	});

	it('returns undefined for unknown values', () => {
		expect(getLineDasharray('unknown')).toBeUndefined();
	});

	it('returns correct dasharray for dashed', () => {
		expect(getLineDasharray('dashed')).toBe('8,4');
	});

	it('returns correct dasharray for dotted', () => {
		expect(getLineDasharray('dotted')).toBe('2,2');
	});

	it('returns correct dasharray for dash-dot', () => {
		expect(getLineDasharray('dash-dot')).toBe('8,4,2,4');
	});

	it('returns correct dasharray for long-dash', () => {
		expect(getLineDasharray('long-dash')).toBe('12,6');
	});
});

// ── createLineOptions with seriesLineStyles ────────────────────

describe('createLineOptions with seriesLineStyles', () => {
	const timeData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
		{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
	];

	it('uses single mark when all series are solid (default)', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS, {
			seriesLineStyles: {}
		});
		// 1 lineY + ruleY = 2 marks
		expect(result.marks.length).toBe(2);
	});

	it('uses single mark when seriesLineStyles is not provided', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS);
		expect(result.marks.length).toBe(2);
	});

	it('creates separate marks when series have different styles', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS, {
			seriesLineStyles: { solar: 'dashed', wind: 'dotted' }
		});
		// 2 lineY marks (one per style) + ruleY = 3 marks
		expect(result.marks.length).toBe(3);
	});

	it('groups series with the same style into one mark', () => {
		const THREE = ['solar', 'wind', 'coal'];
		const TCOL = { solar: '#f00', wind: '#00f', coal: '#333' };
		const TLAB = { solar: 'Solar', wind: 'Wind', coal: 'Coal' };
		const data = [
			{ date: new Date('2024-01-01'), solar: 10, wind: 20, coal: 30 },
			{ date: new Date('2024-01-02'), solar: 15, wind: 25, coal: 35 }
		];
		const result = createLineOptions(data, THREE, TCOL, TLAB, {
			seriesLineStyles: { solar: 'dashed', wind: 'dashed' }
			// coal defaults to solid
		});
		// solid group (coal) + dashed group (solar, wind) + ruleY = 3 marks
		expect(result.marks.length).toBe(3);
	});

	it('handles mix of styled and solid series', () => {
		const result = createLineOptions(timeData, SERIES, COLOURS, LABELS, {
			seriesLineStyles: { solar: 'dash-dot' }
			// wind defaults to solid
		});
		// solid group (wind) + dash-dot group (solar) + ruleY = 3 marks
		expect(result.marks.length).toBe(3);
	});
});

// ── createMixedMarkOptions with seriesLineStyles ───────────────

describe('createMixedMarkOptions with seriesLineStyles', () => {
	const timeData = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
		{ date: new Date('2024-01-02'), solar: 30, wind: 40 }
	];

	it('applies line styles to line series in mixed mode', () => {
		const result = createMixedMarkOptions(
			timeData,
			SERIES,
			COLOURS,
			LABELS,
			{ solar: 'line', wind: 'line' },
			'line',
			{ seriesLineStyles: { solar: 'dashed', wind: 'dotted' } }
		);
		// 2 lineY marks (different styles) + ruleY = 3 marks
		expect(result.marks.length).toBe(3);
	});

	it('does not affect non-line marks in mixed mode', () => {
		const threeSeriesData = [
			{ date: new Date('2024-01-01'), solar: 10, wind: 20, coal: 30 },
			{ date: new Date('2024-01-02'), solar: 15, wind: 25, coal: 35 }
		];
		const result = createMixedMarkOptions(
			threeSeriesData,
			['solar', 'wind', 'coal'],
			{ solar: '#f00', wind: '#00f', coal: '#333' },
			{ solar: 'Solar', wind: 'Wind', coal: 'Coal' },
			{ wind: 'bar' },
			'line', // solar and coal default to line
			{ seriesLineStyles: { solar: 'dotted' } }
		);
		// line solid group (coal) + line dotted group (solar) + bar (wind) + ruleY = 4 marks
		expect(result.marks.length).toBe(4);
	});

	it('uses single line mark in mixed mode when no custom styles', () => {
		const result = createMixedMarkOptions(timeData, SERIES, COLOURS, LABELS, {}, 'line', {
			seriesLineStyles: {}
		});
		// 1 lineY + ruleY = 2 marks
		expect(result.marks.length).toBe(2);
	});

	it('keeps the line range band when a series uses a mixed mark override', () => {
		const data = [
			{ date: new Date('2024-01-01'), solar: 10, wind: 20, minimum: 5, maximum: 25 },
			{ date: new Date('2024-01-02'), solar: 30, wind: 40, minimum: 20, maximum: 50 }
		];
		const result = createMixedMarkOptions(data, SERIES, COLOURS, LABELS, { wind: 'dot' }, 'line', {
			lineRangeMinColumn: 'minimum',
			lineRangeMaxColumn: 'maximum',
			lineRangeOpacity: 0.15
		});

		expect(result.marks).toHaveLength(4);
		expect(result.marks[0]).toMatchObject({ fill: '#f00', fillOpacity: 0.15 });
	});
});
