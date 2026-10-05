import { describe, expect, it } from 'vitest';
import {
	STRIPE_EMPTY_COLOUR,
	stripeCells,
	stripeGradient,
	stripeKeys,
	stripeLegendItems,
	stripeMax,
	stripePeriodAt,
	stripeScale
} from './comparison-stripes.js';
import { monthStart } from './region-comparison.js';

const DAY = 86_400_000;

describe('stripe colour scales', () => {
	it('maps carbon intensity onto the house ramp with a clamped top', () => {
		const scale = stripeScale('intensity', 'demand');
		expect(scale.kind).toBe('ramp');
		expect(scale.colour(0)).toBe('#52a972');
		expect(scale.colour(1000)).toBe('#594929');
		expect(scale.colour(1500)).toBe(scale.colour(1000));
		expect(scale.labels).toEqual(['0', '1,000']);
		expect(scale.unit).toBe('kgCO₂e/MWh');
	});
	it('greys missing readings instead of treating them as zero', () => {
		const scale = stripeScale('share', 'demand');
		expect(scale.colour(null)).toBe(STRIPE_EMPTY_COLOUR);
		expect(scale.colour(undefined)).toBe(STRIPE_EMPTY_COLOUR);
		expect(scale.colour(Number.NaN)).toBe(STRIPE_EMPTY_COLOUR);
		expect(scale.colour(0)).toBe('#ffffff');
	});
	it('floors negative proportions at zero and darkens towards full share', () => {
		const scale = stripeScale('wind_share', 'generation');
		expect(scale.colour(-5)).toBe(scale.colour(0));
		expect(scale.colour(50)).toBe('#2c7629');
		expect(scale.colour(100)).not.toBe(scale.colour(50));
		expect(scale.unit).toBe('% generation');
	});
	it('reads a fossil-free period as renewables green', () => {
		expect(stripeScale('coal_share', 'demand').colour(0)).toBe('#52a972');
		expect(stripeScale('gas_share', 'demand').colour(50)).toBe('#e87809');
		expect(stripeScale('coal_share', 'demand').labels).toEqual(['0', '90']);
	});
	it('diverges around zero net imports with export and import poles', () => {
		const scale = stripeScale('net_imports_share', 'demand');
		expect(scale.kind).toBe('diverging');
		expect(scale.colour(0)).toBe('#ffffff');
		expect(scale.colour(-25)).toBe('#2e69a3');
		expect(scale.colour(40)).toBe('#ac3837');
		expect(scale.labels).toEqual(['Export', 'Import']);
	});
	it('uses the eight price stops as swatches', () => {
		const scale = stripeScale('price_real', 'demand');
		expect(scale.kind).toBe('swatch');
		expect(scale.colours).toHaveLength(8);
		expect(scale.colour(-1000)).toBe('#613c9e');
		expect(scale.colour(15000)).toBe('#621020');
		expect(scale.colour(20000)).toBe(scale.colour(15000));
		expect(scale.labels[1]).toBe('$0');
		expect(scale.unit).toBe('$/MWh');
	});
	it('scales generation to the visible maximum, labelled in GWh', () => {
		expect(stripeMax([1200, 12345, null, Number.NaN])).toBe(12345);
		expect(stripeMax([])).toBe(0);
		const scale = stripeScale('solar_generation', 'demand', 12345);
		expect(scale.domain).toEqual([0, 12345]);
		expect(scale.colour(12345)).toBe('#fed500');
		expect(scale.labels).toEqual(['0', '12.3']);
		expect(scale.unit).toBe('GWh');
		expect(stripeScale('generation', 'demand').domain).toEqual([0, 1]);
	});
	it('hands back the same scale for the same inputs', () => {
		expect(stripeScale('share', 'demand')).toBe(stripeScale('share', 'demand'));
		expect(stripeScale('share', 'demand')).not.toBe(stripeScale('share', 'generation'));
		expect(stripeScale('generation', 'demand', 5)).not.toBe(stripeScale('generation', 'demand', 6));
	});
	it('describes a ramp as a CSS gradient positioned by stop value', () => {
		const gradient = stripeGradient(stripeScale('intensity', 'demand'));
		expect(gradient.startsWith('linear-gradient(to right, #52A972 0%')).toBe(true);
		expect(gradient).toContain('#594929 100%');
		expect(gradient).toContain('10%');
	});
});

describe('stripe legend keys', () => {
	it('keys the zero cell and the no-data grey beside every ramp', () => {
		const imports = stripeScale('net_imports_share', 'demand');
		expect(stripeKeys(imports)).toEqual([
			{ colour: imports.colour(0), label: '0' },
			{ colour: STRIPE_EMPTY_COLOUR, label: 'No data' }
		]);
		// Fossil shares read renewables green at zero.
		expect(stripeKeys(stripeScale('coal_share', 'demand'))[0].colour).toBe(
			stripeScale('coal_share', 'demand').colour(0)
		);
	});
	it('adds zero to the export legend only where no stop or ramp start shows it', () => {
		const labels = (/** @type {string} */ id) =>
			stripeLegendItems(stripeScale(id, 'demand')).map((item) => item.label);
		expect(labels('net_imports_share')).toEqual([
			'Export % demand',
			'Import % demand',
			'0 % demand',
			'No data'
		]);
		expect(labels('intensity').filter((label) => label.startsWith('0'))).toHaveLength(1);
		expect(labels('price').filter((label) => label.startsWith('0'))).toHaveLength(0);
		expect(labels('price').at(-1)).toBe('No data');
	});
});

describe('stripe geometry', () => {
	it('lays cells out at absolute time positions with calendar widths', () => {
		const rows = [{ time: monthStart(Date.UTC(2024, 0)) }, { time: monthStart(Date.UTC(2024, 1)) }];
		const cells = stripeCells(rows, '1M', rows[0].time, 1 / DAY);
		expect(cells).toEqual([
			{ time: rows[0].time, x: 0, width: 31 },
			{ time: rows[1].time, x: 31, width: 29 }
		]);
		expect(stripeCells(rows, '1y', rows[0].time, 1 / DAY)[0].width).toBe(366);
		// A filtered row spans to the same period next year.
		expect(stripeCells(rows, '1M', rows[0].time, 1 / DAY, 'jan')[0].width).toBe(366);
	});
	it('finds the period containing an instant and nothing between periods', () => {
		const rows = [0, 1, 3].map((month) => ({ time: Date.UTC(2024, month) }));
		expect(stripePeriodAt(rows, '1M', Date.UTC(2024, 1, 15))).toBe(Date.UTC(2024, 1));
		expect(stripePeriodAt(rows, '1M', Date.UTC(2024, 2, 15))).toBeNull();
		expect(stripePeriodAt(rows, '1M', Date.UTC(2023, 11, 31))).toBeNull();
		expect(stripePeriodAt(rows, '1M', Date.UTC(2024, 4, 15))).toBeNull();
		expect(stripePeriodAt(rows, '1M', Date.UTC(2024, 3))).toBe(Date.UTC(2024, 3));
		expect(stripePeriodAt([], '1M', 0)).toBeNull();
	});
});
