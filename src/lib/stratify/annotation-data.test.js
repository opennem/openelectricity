import { describe, expect, it } from 'vitest';
import {
	compileAnnotationData,
	DEFAULT_ANNOTATION_MAPPINGS,
	DEFAULT_ANNOTATION_STYLE,
	inferAnnotationMappings,
	parseAnnotationTable
} from './annotation-data.js';

describe('annotation data', () => {
	it('parses quoted labels and infers common column mappings', () => {
		const table = parseAnnotationTable(
			'type,date,label,colour\nrule,2026-07-01T21:20:00+10:00,"High, then falling",#5b9f7b'
		);
		expect(table.rows[0].values.label).toBe('High, then falling');
		expect(inferAnnotationMappings(table.columns)).toMatchObject({
			typeColumn: 'type',
			xColumn: 'date',
			labelColumn: 'label',
			colourColumn: 'colour'
		});
	});

	it('compiles coloured rules and series-based points in temporal mode', () => {
		const table = parseAnnotationTable(
			'type,date,label,colour,y,series\nrule,2026-07-01T21:20:00+10:00,Generation high,#5b9f7b,,\npoint,2026-07-02T00:00:00+10:00,Overnight generation,#b44b38,,generation'
		);
		const mappings = inferAnnotationMappings(table.columns);
		const result = compileAnnotationData(table, 'time-series', mappings, DEFAULT_ANNOTATION_STYLE);

		expect(result.errors).toEqual([]);
		expect(result.annotations).toHaveLength(2);
		expect(result.annotations[0]).toMatchObject({
			type: 'rule',
			text: 'Generation high',
			colour: '#5b9f7b'
		});
		expect(result.annotations[0].x).toBeInstanceOf(Date);
		expect(result.annotations[1]).toMatchObject({ type: 'point', series: 'generation' });
	});

	it('uses the fallback colour and reports invalid row values', () => {
		const table = parseAnnotationTable(
			'type,x,label,colour,y\nrule,1,Start,not-a-colour,\npoint,2,Missing point,#fff,'
		);
		const result = compileAnnotationData(
			table,
			'linear',
			inferAnnotationMappings(table.columns),
			DEFAULT_ANNOTATION_STYLE
		);

		expect(result.annotations).toHaveLength(1);
		expect(result.annotations[0].colour).toBe(DEFAULT_ANNOTATION_STYLE.defaultColour);
		expect(result.warnings[0]).toContain('invalid colour');
		expect(result.errors[0]).toContain('need a Y value or Series');
	});

	it('supports a default point type and explicit right-axis Y value', () => {
		const table = parseAnnotationTable('x,label,y,axis\nA,Peak,42,right');
		/** @type {import('./annotation-data.js').AnnotationMappings} */
		const mappings = {
			...DEFAULT_ANNOTATION_MAPPINGS,
			...inferAnnotationMappings(table.columns),
			defaultType: 'point'
		};
		const result = compileAnnotationData(table, 'category', mappings, DEFAULT_ANNOTATION_STYLE);

		expect(result.annotations[0]).toMatchObject({
			type: 'point',
			x: 'A',
			y: 42,
			axis: 'right'
		});
	});

	it('uses per-row options for colour and point positioning', () => {
		const table = parseAnnotationTable(
			'type,date,label,y\nrule,2026-07-01,Start,\npoint,2026-07-02,Peak,42'
		);
		const result = compileAnnotationData(
			table,
			'time-series',
			inferAnnotationMappings(table.columns),
			DEFAULT_ANNOTATION_STYLE,
			{
				2: { colour: '#123456' },
				3: { colour: '#654321', positionBy: 'y', axis: 'right' }
			}
		);

		expect(result.errors).toEqual([]);
		expect(result.annotations[0].colour).toBe('#123456');
		expect(result.annotations[1]).toMatchObject({
			colour: '#654321',
			y: 42,
			axis: 'right'
		});
	});

	it('uses series positioning instead of a CSV Y value when selected', () => {
		const table = parseAnnotationTable('type,x,label,y\npoint,2,Peak,42');
		const result = compileAnnotationData(
			table,
			'linear',
			inferAnnotationMappings(table.columns),
			DEFAULT_ANNOTATION_STYLE,
			{ 2: { positionBy: 'series', series: 'generation', axis: 'left' } }
		);

		expect(result.errors).toEqual([]);
		expect(result.annotations[0]).toMatchObject({
			y: null,
			series: 'generation',
			axis: 'left'
		});
	});
});
