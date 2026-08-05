import { describe, it, expect } from 'vitest';
import { NETWORK_METRICS, NETWORK_METRIC_KEYS } from './network-metric-definitions.js';

/** @returns {import('./network-metrics-calc.js').NetworkMetricsContext} */
function fullContext() {
	return {
		renewablesPct: 41.234,
		renewablesTrimmed: false,
		fossilPct: 55.678,
		demandAvgMW: 23456.7,
		peakDemand: {
			value: 31234.5,
			time: 1_700_000_000_000,
			isPower: true,
			periodLabel: 'Tue 12:30'
		},
		avgPrice: 87.654,
		generationMWh: 123456.7
	};
}

/** @returns {import('./network-metrics-calc.js').NetworkMetricsContext} */
function emptyContext() {
	return {
		renewablesPct: null,
		renewablesTrimmed: false,
		fossilPct: null,
		demandAvgMW: null,
		peakDemand: null,
		avgPrice: null,
		generationMWh: null
	};
}

describe('NETWORK_METRICS', () => {
	it('resolves every key in the ordered list', () => {
		for (const key of NETWORK_METRIC_KEYS) {
			expect(NETWORK_METRICS[key], key).toBeDefined();
		}
	});

	it('formats a fully-populated context', () => {
		const ctx = fullContext();
		expect(NETWORK_METRICS.renewables.compute(ctx)).toMatchObject({ value: '41.2', unit: '%' });
		expect(NETWORK_METRICS.fossils.compute(ctx)).toMatchObject({ value: '55.7', unit: '%' });
		expect(NETWORK_METRICS.demand.compute(ctx)).toMatchObject({ value: '23,457', unit: 'MW' });
		expect(NETWORK_METRICS.avgPrice.compute(ctx)).toMatchObject({ value: '87.65', unit: '$/MWh' });
		expect(NETWORK_METRICS.generation.compute(ctx)).toMatchObject({
			value: '123,457',
			unit: 'MWh'
		});
	});

	it('annotates the peak cell with its period and highlight time', () => {
		const result = NETWORK_METRICS.peakDemand.compute(fullContext());
		expect(result).toMatchObject({
			value: '31,235',
			unit: 'MW',
			subtitle: 'Tue 12:30',
			highlightTime: 1_700_000_000_000
		});
	});

	it('switches the peak unit at energy basis', () => {
		const ctx = fullContext();
		ctx.peakDemand = { value: 500_000, time: 0, isPower: false, periodLabel: 'March' };
		expect(NETWORK_METRICS.peakDemand.compute(ctx)).toMatchObject({ unit: 'MWh' });
	});

	it('notes partial demand coverage on trimmed ranges', () => {
		const ctx = fullContext();
		ctx.renewablesTrimmed = true;
		expect(NETWORK_METRICS.renewables.compute(ctx).subtitle).toMatch(/partial/i);
	});

	it('falls back to the greyed placeholder on an empty context', () => {
		const ctx = emptyContext();
		for (const key of NETWORK_METRIC_KEYS) {
			expect(NETWORK_METRICS[key].compute(ctx).value, key).toBe('--');
		}
	});
});
