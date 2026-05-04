import { describe, it, expect } from 'vitest';
import StratifyPlotProject from './StratifyPlotProject.svelte.js';

/**
 * Build a fresh project. The constructor schedules $effect calls; in a
 * non-component test environment they're tolerated because we never trigger
 * the dependencies they read.
 *
 * @returns {StratifyPlotProject}
 */
function createProject() {
	return new StratifyPlotProject();
}

describe('StratifyPlotProject — showLegend', () => {
	it('defaults to true on a fresh project', () => {
		const project = createProject();
		expect(project.showLegend).toBe(true);
	});

	it('toJSON() includes showLegend defaulting to true', () => {
		const project = createProject();
		expect(project.toJSON().showLegend).toBe(true);
	});

	it('toJSON() reflects user changes', () => {
		const project = createProject();
		project.showLegend = false;
		expect(project.toJSON().showLegend).toBe(false);
	});

	it('loadFromSnapshot() accepts showLegend: false', () => {
		const project = createProject();
		project.loadFromSnapshot(/** @type {any} */ ({ showLegend: false }));
		expect(project.showLegend).toBe(false);
	});

	it('loadFromSnapshot() defaults showLegend to true when omitted (back-compat)', () => {
		const project = createProject();
		project.showLegend = false;
		project.loadFromSnapshot(/** @type {any} */ ({}));
		expect(project.showLegend).toBe(true);
	});

	it('reset() restores showLegend to true', () => {
		const project = createProject();
		project.showLegend = false;
		project.reset();
		expect(project.showLegend).toBe(true);
	});
});

describe('StratifyPlotProject — facetColumn', () => {
	it('defaults to null on a fresh project', () => {
		const project = createProject();
		expect(project.facetColumn).toBeNull();
	});

	it('toJSON() includes facetColumn defaulting to null', () => {
		const project = createProject();
		expect(project.toJSON().facetColumn).toBeNull();
	});

	it('toJSON() reflects user changes', () => {
		const project = createProject();
		project.facetColumn = 'region';
		expect(project.toJSON().facetColumn).toBe('region');
	});

	it('loadFromSnapshot() accepts facetColumn', () => {
		const project = createProject();
		project.loadFromSnapshot(/** @type {any} */ ({ facetColumn: 'region' }));
		expect(project.facetColumn).toBe('region');
	});

	it('loadFromSnapshot() defaults facetColumn to null when omitted (back-compat)', () => {
		const project = createProject();
		project.facetColumn = 'region';
		project.loadFromSnapshot(/** @type {any} */ ({}));
		expect(project.facetColumn).toBeNull();
	});

	it('reset() restores facetColumn to null', () => {
		const project = createProject();
		project.facetColumn = 'region';
		project.reset();
		expect(project.facetColumn).toBeNull();
	});

	it('orderedSeriesNames excludes the facet column', () => {
		const project = createProject();
		project.csvText = 'date,region,solar,wind\n2024-01-01,NSW,100,50\n2024-02-01,VIC,120,60';
		project.facetColumn = 'region';
		expect(project.orderedSeriesNames).not.toContain('region');
		expect(project.orderedSeriesNames).toEqual(expect.arrayContaining(['solar', 'wind']));
	});
});

describe('StratifyPlotProject — animateAsOneChart', () => {
	it('defaults to false', () => {
		const project = createProject();
		expect(project.animateAsOneChart).toBe(false);
	});

	it('toJSON() includes animateAsOneChart', () => {
		const project = createProject();
		project.animateAsOneChart = true;
		expect(project.toJSON().animateAsOneChart).toBe(true);
	});

	it('loadFromSnapshot() restores animateAsOneChart', () => {
		const project = createProject();
		project.loadFromSnapshot(/** @type {any} */ ({ animateAsOneChart: true }));
		expect(project.animateAsOneChart).toBe(true);
	});

	it('loadFromSnapshot() defaults to false when omitted', () => {
		const project = createProject();
		project.animateAsOneChart = true;
		project.loadFromSnapshot(/** @type {any} */ ({}));
		expect(project.animateAsOneChart).toBe(false);
	});

	it('reset() restores animateAsOneChart to false', () => {
		const project = createProject();
		project.animateAsOneChart = true;
		project.reset();
		expect(project.animateAsOneChart).toBe(false);
	});
});
