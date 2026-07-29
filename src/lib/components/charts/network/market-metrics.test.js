import { describe, it, expect } from 'vitest';
import { MARKET_METRIC_NAMES } from './market-metric-names.js';
import { MARKET_METRIC_CONFIG, getMarketMetricConfig } from './market-metrics.js';
import { curtailmentMetric } from '$lib/facilities/curtailment.js';

/**
 * The market layer is split across two files by design — `market-metric-names.js`
 * stays dependency-free so the server route can import it, while the
 * presentation lives in `market-metrics.js`. That split means a new metric has
 * to be added in both places, and `seriesDefsFor` spreads a missing
 * presentation entry into `{ metric, id: undefined, colour: undefined }`
 * rather than throwing — a chart that silently renders nothing. These tests
 * hold the two halves together.
 */
describe('market metric config', () => {
	const publicMetrics = Object.keys(MARKET_METRIC_NAMES);

	it('covers every public metric except price (handled by the price arm)', () => {
		const missing = publicMetrics.filter((m) => m !== 'price' && !MARKET_METRIC_CONFIG[m]);
		expect(missing).toEqual([]);
	});

	it('builds one fully-populated series def per OE metric', () => {
		for (const [publicMetric, config] of Object.entries(MARKET_METRIC_CONFIG)) {
			const oeMetrics = MARKET_METRIC_NAMES[publicMetric];
			expect(config.seriesDefs.map((d) => d.metric)).toEqual(oeMetrics);

			for (const def of config.seriesDefs) {
				expect(def.id, `${publicMetric} → ${def.metric} id`).toBeTruthy();
				expect(def.label, `${publicMetric} → ${def.metric} label`).toBeTruthy();
				expect(def.colour, `${publicMetric} → ${def.metric} colour`).toMatch(/^#[0-9a-f]{6}$/i);
			}
		}
	});

	it('splits curtailment by fuel tech, with the combined key keeping both', () => {
		expect(getMarketMetricConfig('curtailment_wind')?.seriesDefs).toHaveLength(1);
		expect(getMarketMetricConfig('curtailment_solar')?.seriesDefs).toHaveLength(1);
		// The combined key keeps both splits, for facilities with wind and solar.
		expect(getMarketMetricConfig('curtailment')?.seriesDefs).toHaveLength(2);
	});

	it('resolves every metric the facility curtailment panel can request', () => {
		// The panel picks its metric in $lib/facilities/curtailment.js, a different
		// package from this registry. Renaming a key here (or there) would silently
		// fall through to the generation arm of NetworkChart and render nothing —
		// this is the assertion that catches the drift.
		for (const kind of /** @type {const} */ (['wind', 'solar', 'both'])) {
			for (const basis of /** @type {const} */ (['power', 'energy'])) {
				const metric = curtailmentMetric(kind, basis);
				expect(getMarketMetricConfig(metric), `${kind}/${basis} → ${metric}`).toBeDefined();
			}
		}
	});

	it('pairs each power metric with an energy variant carrying Wh', () => {
		for (const metric of ['curtailment', 'curtailment_wind', 'curtailment_solar']) {
			expect(getMarketMetricConfig(metric)?.baseUnit).toBe('W');
			expect(getMarketMetricConfig(`${metric}_energy`)?.baseUnit).toBe('Wh');
		}
	});

	it('shares one series id across a metric and its energy variant', () => {
		// Panels ladder power↔energy as the interval changes; a differing id would
		// restyle the series mid-zoom.
		for (const metric of ['curtailment', 'curtailment_wind', 'curtailment_solar']) {
			const power = getMarketMetricConfig(metric)?.seriesDefs.map((d) => d.id);
			const energy = getMarketMetricConfig(`${metric}_energy`)?.seriesDefs.map((d) => d.id);
			expect(energy).toEqual(power);
		}
	});

	it('returns undefined for a non-market metric', () => {
		expect(getMarketMetricConfig('power')).toBeUndefined();
		expect(getMarketMetricConfig('energy')).toBeUndefined();
	});
});
