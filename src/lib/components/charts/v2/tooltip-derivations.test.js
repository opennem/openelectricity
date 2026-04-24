import { describe, it, expect } from 'vitest';
import {
	getActiveData,
	getValueKey,
	getTotalForRow,
	formatTooltipDate,
	buildSeriesRows
} from './tooltip-derivations.js';

/**
 * Build a minimal mock chart with only the properties the helpers read.
 *
 * @param {Partial<any>} [overrides]
 * @returns {any}
 */
function makeChart(overrides = {}) {
	return {
		hoverData: undefined,
		focusData: undefined,
		hoverKey: undefined,
		chartTooltips: { valueKey: undefined, showTotal: false },
		visibleSeriesNames: [],
		seriesLabels: {},
		seriesColours: {},
		convertAndFormatValue: (/** @type {number} */ v) => v.toFixed(1),
		isCategoryChart: false,
		xKey: 'category',
		formatX: (/** @type {any} */ v) => String(v),
		timeZone: 'Australia/Brisbane',
		chartOptions: { displayUnit: 'MW' },
		...overrides
	};
}

describe('getActiveData', () => {
	it('prefers hoverData when both hover and focus are set', () => {
		const chart = makeChart({
			hoverData: { time: 1, coal: 10 },
			focusData: { time: 2, coal: 20 }
		});
		expect(getActiveData(chart)).toEqual({ time: 1, coal: 10 });
	});

	it('falls back to focusData when hover is missing', () => {
		const chart = makeChart({
			hoverData: undefined,
			focusData: { time: 2, coal: 20 }
		});
		expect(getActiveData(chart)).toEqual({ time: 2, coal: 20 });
	});

	it('returns undefined when neither is set', () => {
		expect(getActiveData(makeChart())).toBeUndefined();
	});

	it('prefers hoverData over a null focus (not just undefined)', () => {
		const chart = makeChart({
			hoverData: { time: 1 },
			focusData: null
		});
		expect(getActiveData(chart)).toEqual({ time: 1 });
	});
});

describe('getValueKey', () => {
	it('prefers chartTooltips.valueKey over hoverKey', () => {
		const chart = makeChart({
			hoverKey: 'coal',
			chartTooltips: { valueKey: 'gas', showTotal: false }
		});
		expect(getValueKey(chart)).toBe('gas');
	});

	it('falls back to hoverKey when valueKey is not set', () => {
		const chart = makeChart({
			hoverKey: 'coal',
			chartTooltips: { valueKey: undefined, showTotal: false }
		});
		expect(getValueKey(chart)).toBe('coal');
	});

	it('returns undefined when neither is set', () => {
		expect(getValueKey(makeChart())).toBeUndefined();
	});
});

describe('getTotalForRow', () => {
	it('sums numeric values across visibleSeriesNames', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas', 'wind']
		});
		const total = getTotalForRow(chart, { coal: 10, gas: 20, wind: 30 });
		expect(total).toBe(60);
	});

	it('ignores keys not in visibleSeriesNames (hidden series)', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas']
		});
		const total = getTotalForRow(chart, { coal: 10, gas: 20, hidden: 9999 });
		expect(total).toBe(30);
	});

	it('skips missing and non-numeric fields', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas', 'wind', 'solar']
		});
		const total = getTotalForRow(chart, {
			coal: 10,
			gas: 'not-a-number',
			wind: NaN
			// solar missing
		});
		expect(total).toBe(10);
	});

	it('returns 0 when activeData is undefined', () => {
		const chart = makeChart({ visibleSeriesNames: ['coal'] });
		expect(getTotalForRow(chart, undefined)).toBe(0);
	});

	it('returns 0 when no series are visible', () => {
		const chart = makeChart({ visibleSeriesNames: [] });
		expect(getTotalForRow(chart, { coal: 10 })).toBe(0);
	});
});

describe('formatTooltipDate', () => {
	it('returns empty string when activeData is undefined', () => {
		expect(formatTooltipDate(makeChart(), undefined)).toBe('');
	});

	it('formats a time-based chart using DST-free en-AU', () => {
		const chart = makeChart({ timeZone: 'Australia/Brisbane' });
		// 2026-03-12 04:30:00 UTC → 14:30 Brisbane (AEST +10, no DST)
		const date = new Date(Date.UTC(2026, 2, 12, 4, 30));
		const result = formatTooltipDate(chart, { time: date.getTime(), date });
		expect(result).toContain('Mar');
		expect(result).toContain('2026');
		expect(result).toContain('12');
		expect(result).toMatch(/14:30|2:30/); // AEST 14:30 (24h) or 2:30 (12h locale)
	});

	it('returns empty string for a time chart with no date field', () => {
		expect(formatTooltipDate(makeChart(), { time: 123 })).toBe('');
	});

	it('routes category charts through chart.formatX', () => {
		const chart = makeChart({
			isCategoryChart: true,
			xKey: 'fuelTech',
			formatX: (/** @type {any} */ v) => `[${v}]`
		});
		expect(formatTooltipDate(chart, { fuelTech: 'coal' })).toBe('[coal]');
	});

	it('returns empty string for a category chart with no xKey value', () => {
		const chart = makeChart({ isCategoryChart: true, xKey: 'missing' });
		expect(formatTooltipDate(chart, { other: 'ignored' })).toBe('');
	});
});

describe('buildSeriesRows', () => {
	it('returns rows in visibleSeriesNames order', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas', 'wind'],
			seriesLabels: { coal: 'Coal', gas: 'Gas', wind: 'Wind' },
			seriesColours: { coal: '#000', gas: '#888', wind: '#0f0' }
		});
		const rows = buildSeriesRows(chart, { coal: 10, gas: 20, wind: 30 });
		expect(rows.map((r) => r.key)).toEqual(['coal', 'gas', 'wind']);
	});

	it('marks only the hovered row with isHovered', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas', 'wind'],
			hoverKey: 'gas'
		});
		const rows = buildSeriesRows(chart, { coal: 10, gas: 20, wind: 30 });
		expect(rows.find((r) => r.key === 'gas')?.isHovered).toBe(true);
		expect(rows.find((r) => r.key === 'coal')?.isHovered).toBe(false);
		expect(rows.find((r) => r.key === 'wind')?.isHovered).toBe(false);
	});

	it('prefers chartTooltips.valueKey over hoverKey for isHovered', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas'],
			hoverKey: 'coal',
			chartTooltips: { valueKey: 'gas', showTotal: false }
		});
		const rows = buildSeriesRows(chart, { coal: 10, gas: 20 });
		expect(rows.find((r) => r.key === 'gas')?.isHovered).toBe(true);
		expect(rows.find((r) => r.key === 'coal')?.isHovered).toBe(false);
	});

	it('formats values via chart.convertAndFormatValue', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal'],
			convertAndFormatValue: (/** @type {number} */ v) => `~${v.toFixed(2)}~`
		});
		const rows = buildSeriesRows(chart, { coal: 12.345 });
		expect(rows[0].formattedValue).toBe('~12.35~');
		expect(rows[0].value).toBe(12.345);
	});

	it('still renders a row for missing/non-numeric series, with undefined value', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal', 'gas', 'wind']
		});
		const rows = buildSeriesRows(chart, { coal: 10 /* gas missing, wind non-numeric */, wind: 'nope' });
		expect(rows).toHaveLength(3);
		expect(rows.find((r) => r.key === 'gas')?.value).toBeUndefined();
		expect(rows.find((r) => r.key === 'gas')?.formattedValue).toBe('');
		expect(rows.find((r) => r.key === 'wind')?.value).toBeUndefined();
		expect(rows.find((r) => r.key === 'wind')?.formattedValue).toBe('');
	});

	it('falls back to the key when seriesLabels has no entry', () => {
		const chart = makeChart({
			visibleSeriesNames: ['coal'],
			seriesLabels: {}
		});
		const rows = buildSeriesRows(chart, { coal: 10 });
		expect(rows[0].label).toBe('coal');
	});

	it('returns an empty array when activeData is undefined', () => {
		const chart = makeChart({ visibleSeriesNames: ['coal'] });
		expect(buildSeriesRows(chart, undefined)).toEqual([]);
	});
});
