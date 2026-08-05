import { describe, it, expect } from 'vitest';
import { MARKET_METRIC_NAMES } from './market-metric-names.js';
import {
	MARKET_METRIC_CONFIG,
	getMarketMetricConfig,
	curtailmentMetric
} from './market-metrics.js';

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

	// price renders through NetworkChart's dedicated price arm; the renewables
	// pair is fetched headlessly for the tracker's metrics grid
	// (network-market-data.svelte.js) and is never charted.
	const UNCHARTED_METRICS = ['price', 'renewables', 'renewables_energy'];

	it('covers every charted public metric', () => {
		const missing = publicMetrics.filter(
			(m) => !UNCHARTED_METRICS.includes(m) && !MARKET_METRIC_CONFIG[m]
		);
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

	it('ladders each fuel-tech split between power and energy', () => {
		expect(curtailmentMetric('wind', 'power')).toBe('curtailment_wind');
		expect(curtailmentMetric('wind', 'energy')).toBe('curtailment_wind_energy');
		expect(curtailmentMetric('solar', 'power')).toBe('curtailment_solar');
		expect(curtailmentMetric('solar', 'energy')).toBe('curtailment_solar_energy');
	});

	it('maps a wind + solar facility to the combined key', () => {
		expect(curtailmentMetric('both', 'power')).toBe('curtailment');
		expect(curtailmentMetric('both', 'energy')).toBe('curtailment_energy');
	});

	it('splits curtailment by fuel tech, with the combined key keeping both', () => {
		expect(getMarketMetricConfig('curtailment_wind')?.seriesDefs).toHaveLength(1);
		expect(getMarketMetricConfig('curtailment_solar')?.seriesDefs).toHaveLength(1);
		// The combined key keeps both splits, for facilities with wind and solar.
		expect(getMarketMetricConfig('curtailment')?.seriesDefs).toHaveLength(2);
	});

	it('resolves every metric the facility curtailment panel can request', () => {
		// CURTAILMENT_METRICS and MARKET_METRIC_NAMES are separate tables that have
		// to agree. A key renamed in one and not the other leaves the panel asking
		// for a metric that doesn't resolve — NetworkChart falls through to its
		// generation arm and renders nothing. This is what catches that.
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
