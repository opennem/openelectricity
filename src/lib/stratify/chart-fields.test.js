import { describe, expect, it } from 'vitest';
import {
	CHART_FIELDS,
	diffSnapshots,
	encodeChartFields,
	getChartField,
	isSameFieldValue,
	mergeFields,
	withChartDefaults
} from './chart-fields.js';

describe('CHART_FIELDS', () => {
	it('has unique keys and Sanity field names', () => {
		const keys = CHART_FIELDS.map((field) => field.key);
		const docKeys = CHART_FIELDS.map((field) => field.docKey ?? field.key);
		expect(new Set(keys).size).toBe(keys.length);
		expect(new Set(docKeys).size).toBe(docKeys.length);
	});

	it('labels every field', () => {
		for (const field of CHART_FIELDS) {
			expect(field.label, field.key).toBeTruthy();
		}
	});

	it('looks fields up by key', () => {
		expect(getChartField('userSeriesColours')).toMatchObject({
			label: 'Series colours',
			encoding: 'json'
		});
		expect(getChartField('snapshotVersion')).toBeUndefined();
	});
});

describe('withChartDefaults', () => {
	it('fills missing and null values, keeps falsy values and drops unknown keys', () => {
		const values = withChartDefaults({ chartHeight: 0, title: null, unknown: 'x' });

		expect(values.chartHeight).toBe(0);
		expect(values.title).toBe('');
		expect(values.chartType).toBe('line');
		expect(values.version).toBe(1);
		expect(values).not.toHaveProperty('unknown');
		expect(Object.keys(values)).toHaveLength(CHART_FIELDS.length);
	});

	it('never shares mutable defaults between calls', () => {
		const a = withChartDefaults({});
		const b = withChartDefaults({});
		a.hiddenSeries.push('solar');
		a.userSeriesColours.solar = '#ff0';

		expect(b.hiddenSeries).toEqual([]);
		expect(b.userSeriesColours).toEqual({});
		expect(getChartField('hiddenSeries')?.default).toEqual([]);
	});
});

describe('encodeChartFields', () => {
	it('JSON-encodes json fields, renames doc keys and keeps null and zero', () => {
		expect(
			encodeChartFields({
				userSeriesColours: { solar: '#ff0' },
				plotOverrides: null,
				scatterSizeColumn: null,
				lineRangeOpacity: 0,
				version: 2
			})
		).toEqual({
			userSeriesColours: '{"solar":"#ff0"}',
			plotOverrides: 'null',
			scatterSizeColumn: null,
			lineRangeOpacity: 0,
			snapshotVersion: 2
		});
	});

	it('drops undefined values and keys outside the registry', () => {
		expect(
			encodeChartFields({
				title: undefined,
				userId: 'someone-else',
				_id: 'chart-2',
				snapshotVersion: 9
			})
		).toEqual({});
	});
});

describe('isSameFieldValue', () => {
	it('compares objects regardless of key order', () => {
		expect(isSameFieldValue({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
	});

	it('treats array order, null and type differences as changes', () => {
		expect(isSameFieldValue(['a', 'b'], ['b', 'a'])).toBe(false);
		expect(isSameFieldValue(null, {})).toBe(false);
		expect(isSameFieldValue([], {})).toBe(false);
		expect(isSameFieldValue(0, '0')).toBe(false);
	});

	it('ignores undefined object properties', () => {
		expect(isSameFieldValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
	});
});

describe('diffSnapshots', () => {
	it('returns changed registry fields in registry order', () => {
		const before = withChartDefaults({ title: 'Generation' });
		const after = {
			...before,
			title: 'Generation mix',
			chartType: 'stacked-area',
			userSeriesColours: { solar: '#ff0' }
		};

		expect(diffSnapshots(before, after)).toEqual([
			{ field: 'title', before: 'Generation', after: 'Generation mix' },
			{ field: 'chartType', before: 'line', after: 'stacked-area' },
			{ field: 'userSeriesColours', before: {}, after: { solar: '#ff0' } }
		]);
	});

	it('ignores keys outside the registry and structurally equal values', () => {
		const before = { title: 'A', annotationStyle: { lineWidth: 1, colour: '#000' }, _rev: '1' };
		const after = { title: 'A', annotationStyle: { colour: '#000', lineWidth: 1 }, _rev: '2' };

		expect(diffSnapshots(before, after)).toEqual([]);
	});
});

describe('mergeFields', () => {
	const base = withChartDefaults({ title: 'Base', chartHeight: 250 });

	it('takes their changes to fields I did not touch', () => {
		const mine = { ...base, title: 'Mine' };
		const theirs = { ...base, chartHeight: 400, userSeriesColours: { wind: '#0f0' } };

		const { merged, conflicts } = mergeFields(base, mine, theirs);

		expect(conflicts).toEqual([]);
		expect(merged.title).toBe('Mine');
		expect(merged.chartHeight).toBe(400);
		expect(merged.userSeriesColours).toEqual({ wind: '#0f0' });
	});

	it('merges cleanly when both sides made the same change', () => {
		const mine = { ...base, seriesOrder: ['solar', 'wind'] };
		const theirs = { ...base, seriesOrder: ['solar', 'wind'] };

		expect(mergeFields(base, mine, theirs).conflicts).toEqual([]);
	});

	it('reports a conflict and keeps mine when both sides changed a field differently', () => {
		const mine = { ...base, title: 'Mine', userSeriesColours: { solar: '#ff0' } };
		const theirs = { ...base, title: 'Theirs', userSeriesColours: { solar: '#f00' } };

		const { merged, conflicts } = mergeFields(base, mine, theirs);

		expect(conflicts).toEqual([
			{ field: 'title', base: 'Base', mine: 'Mine', theirs: 'Theirs' },
			{
				field: 'userSeriesColours',
				base: {},
				mine: { solar: '#ff0' },
				theirs: { solar: '#f00' }
			}
		]);
		expect(merged.title).toBe('Mine');
		expect(merged.userSeriesColours).toEqual({ solar: '#ff0' });
	});

	it('keeps my keys outside the registry', () => {
		const mine = { ...base, currentChartId: 'chart-1' };

		expect(mergeFields(base, mine, base).merged.currentChartId).toBe('chart-1');
	});
});
