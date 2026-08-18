import { describe, expect, it } from 'vitest';
import {
	compileAnnotationItems,
	createAnnotationItem,
	DEFAULT_ANNOTATION_STYLE
} from './annotation-data.js';

/** @param {Partial<import('./annotation-data.js').AnnotationItem>} patch */
function item(patch) {
	return { ...createAnnotationItem(), ...patch };
}

describe('annotation items', () => {
	it('creates a blank item for the guided editor', () => {
		expect(createAnnotationItem()).toMatchObject({
			type: '',
			xSource: 'data',
			x: '',
			label: '',
			positionBy: 'y',
			y: '',
			series: null,
			axis: 'left',
			labelPosition: 'top'
		});
	});

	it('compiles rule and series-positioned point annotations', () => {
		const result = compileAnnotationItems(
			[
				item({ type: 'rule', x: '2026-07-01', label: 'Start' }),
				item({
					type: 'point',
					x: '2026-07-02',
					label: 'Peak',
					positionBy: 'series',
					series: 'generation',
					axis: 'right',
					labelPosition: 'right'
				})
			],
			'time-series',
			DEFAULT_ANNOTATION_STYLE
		);

		expect(result.errors).toEqual([]);
		expect(result.annotations[0]).toMatchObject({
			type: 'rule',
			text: 'Start',
			colour: DEFAULT_ANNOTATION_STYLE.ruleColour,
			labelColour: DEFAULT_ANNOTATION_STYLE.labelColour
		});
		expect(result.annotations[0].x).toBeInstanceOf(Date);
		expect(result.annotations[1]).toMatchObject({
			type: 'point',
			series: 'generation',
			axis: 'right',
			labelPosition: 'right'
		});
	});

	it('compiles a numeric point position', () => {
		const result = compileAnnotationItems(
			[item({ type: 'point', x: '2', label: 'Peak', y: '42' })],
			'linear',
			DEFAULT_ANNOTATION_STYLE
		);
		expect(result.errors).toEqual([]);
		expect(result.annotations[0]).toMatchObject({ x: 2, y: 42, series: null });
	});

	it('compiles appearance independently for each annotation', () => {
		const result = compileAnnotationItems(
			[
				item({
					type: 'rule',
					x: 'A',
					label: 'First',
					appearance: { ...DEFAULT_ANNOTATION_STYLE, ruleColour: '#123456', fontSize: 16 }
				}),
				item({ type: 'rule', x: 'B', label: 'Second' })
			],
			'category',
			DEFAULT_ANNOTATION_STYLE
		);

		expect(result.annotations[0]).toMatchObject({
			colour: '#123456',
			style: { fontSize: 16 }
		});
		expect(result.annotations[1]).toMatchObject({
			colour: DEFAULT_ANNOTATION_STYLE.ruleColour,
			style: { fontSize: DEFAULT_ANNOTATION_STYLE.fontSize }
		});
	});

	it('silently skips an item until its type is selected', () => {
		const result = compileAnnotationItems(
			[
				item({}),
				item({ type: 'point', x: '2', label: 'Peak', positionBy: 'series', series: null })
			],
			'linear',
			DEFAULT_ANNOTATION_STYLE
		);
		expect(result.annotations).toEqual([]);
		expect(result.errors).toEqual(['Annotation 2: choose a series.']);
	});

	it('leaves required X and Label validation to the inline editor', () => {
		const result = compileAnnotationItems(
			[item({ type: 'rule', x: '', label: '' })],
			'category',
			DEFAULT_ANNOTATION_STYLE
		);
		expect(result.annotations).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it('falls back when appearance colours are invalid', () => {
		const result = compileAnnotationItems(
			[item({ type: 'rule', x: 'A', label: 'Start' })],
			'category',
			{ ...DEFAULT_ANNOTATION_STYLE, ruleColour: 'not a colour', labelColour: 'also invalid' }
		);
		expect(result.annotations[0]).toMatchObject({
			colour: DEFAULT_ANNOTATION_STYLE.ruleColour,
			labelColour: DEFAULT_ANNOTATION_STYLE.labelColour
		});
	});
});
