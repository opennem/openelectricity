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
