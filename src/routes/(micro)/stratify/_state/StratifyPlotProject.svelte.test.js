import { describe, it, expect } from 'vitest';
import StratifyPlotProject from './StratifyPlotProject.svelte.js';
import { examples } from '../_utils/examples.js';

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

describe('StratifyPlotProject — tooltip date format', () => {
	it('defaults to date and round-trips date plus time', () => {
		const project = createProject();
		expect(project.tooltipDateFormat).toBe('date');

		project.tooltipDateFormat = 'date-time';
		const restored = createProject();
		restored.loadFromSnapshot(project.toJSON());
		expect(restored.tooltipDateFormat).toBe('date-time');
	});

	it('reset restores date-only formatting', () => {
		const project = createProject();
		project.tooltipDateFormat = 'time';
		project.reset();
		expect(project.tooltipDateFormat).toBe('date');
	});
});

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

describe('StratifyPlotProject — map fields', () => {
	it('defaults the 10 map fields on a fresh project', () => {
		const project = createProject();
		expect(project.latColumn).toBeNull();
		expect(project.lngColumn).toBeNull();
		expect(project.labelColumn).toBeNull();
		expect(project.sizeColumn).toBeNull();
		expect(project.colourColumn).toBeNull();
		expect(project.mapColourMode).toBe('single');
		expect(project.singleMarkerColour).toBe('#3b82f6');
		expect(project.mapMinRadius).toBe(4);
		expect(project.mapMaxRadius).toBe(24);
		expect(project.mapTheme).toBe('light');
	});

	it('toJSON() round-trips through loadFromSnapshot()', () => {
		const project = createProject();
		project.chartType = 'map';
		project.latColumn = 'lat';
		project.lngColumn = 'lng';
		project.labelColumn = 'name';
		project.sizeColumn = 'capacity';
		project.colourColumn = 'fueltech';
		project.mapColourMode = 'category';
		project.singleMarkerColour = '#ff0000';
		project.mapMinRadius = 8;
		project.mapMaxRadius = 40;
		project.mapTheme = 'satellite';

		const snapshot = project.toJSON();
		const restored = createProject();
		restored.loadFromSnapshot(snapshot);

		expect(restored.chartType).toBe('map');
		expect(restored.latColumn).toBe('lat');
		expect(restored.lngColumn).toBe('lng');
		expect(restored.labelColumn).toBe('name');
		expect(restored.sizeColumn).toBe('capacity');
		expect(restored.colourColumn).toBe('fueltech');
		expect(restored.mapColourMode).toBe('category');
		expect(restored.singleMarkerColour).toBe('#ff0000');
		expect(restored.mapMinRadius).toBe(8);
		expect(restored.mapMaxRadius).toBe(40);
		expect(restored.mapTheme).toBe('satellite');
	});

	it('reset() restores all map fields to defaults', () => {
		const project = createProject();
		project.latColumn = 'lat';
		project.mapColourMode = 'category';
		project.mapTheme = 'dark';
		project.reset();

		expect(project.latColumn).toBeNull();
		expect(project.mapColourMode).toBe('single');
		expect(project.mapTheme).toBe('light');
	});

	it('mapColourGroupNames returns unique values of colourColumn in data order', () => {
		const project = createProject();
		project.csvText =
			'name,lat,lng,fueltech\nBayswater,-32.4,150.9,coal\nLiddell,-32.3,150.9,coal\nHornsdale,-33.1,138.3,battery';
		project.colourColumn = 'fueltech';

		expect(project.mapColourGroupNames).toEqual(['coal', 'battery']);
	});

	it('mapColourGroupNames is empty when colourColumn is null', () => {
		const project = createProject();
		project.csvText = 'name,lat,lng,fueltech\nBayswater,-32.4,150.9,coal';
		expect(project.mapColourGroupNames).toEqual([]);
	});
});

describe('StratifyPlotProject — line range fields', () => {
	it('uses defaults and preserves explicit zero opacity through JSON', () => {
		const project = createProject();
		expect(project.lineRangeMinColumn).toBeNull();
		expect(project.lineRangeMaxColumn).toBeNull();
		expect(project.lineRangeOpacity).toBe(0.2);

		project.lineRangeMinColumn = 'minimum';
		project.lineRangeMaxColumn = 'maximum';
		project.lineRangeOpacity = 0;
		const restored = createProject();
		restored.loadFromSnapshot(project.toJSON());

		expect(restored.lineRangeMinColumn).toBe('minimum');
		expect(restored.lineRangeMaxColumn).toBe('maximum');
		expect(restored.lineRangeOpacity).toBe(0);
	});

	it('excludes range columns from line series while preserving their row values', () => {
		const project = createProject();
		project.csvText = 'date,mean,minimum,maximum\n2025-01-01,20,10,30\n2025-01-02,25,12,36';
		project.lineRangeMinColumn = 'minimum';
		project.lineRangeMaxColumn = 'maximum';

		expect(project.orderedSeriesNames).toEqual(['mean']);
		expect(project.visibleData[0]).toMatchObject({ mean: 20, minimum: 10, maximum: 30 });
	});

	it('keeps a single partially configured bound available as a line series', () => {
		const project = createProject();
		project.csvText = 'date,mean,minimum,maximum\n2025-01-01,20,10,30';
		project.lineRangeMinColumn = 'minimum';

		expect(project.orderedSeriesNames).toEqual(['mean', 'minimum', 'maximum']);
	});

	it('does not hide mapped range columns from non-line chart types', () => {
		const project = createProject();
		project.csvText = 'category,mean,minimum,maximum\nA,20,10,30';
		project.lineRangeMinColumn = 'minimum';
		project.lineRangeMaxColumn = 'maximum';
		project.chartType = 'column';

		expect(project.orderedSeriesNames).toEqual(['mean', 'minimum', 'maximum']);
	});

	it('clears missing, non-numeric and duplicate range mappings', () => {
		const project = createProject();
		project.csvText = 'date,mean,minimum,label\n2025-01-01,20,10,low';
		project.lineRangeMinColumn = 'minimum';
		project.lineRangeMaxColumn = 'label';
		project.validateLineRangeColumns();
		expect(project.lineRangeMinColumn).toBe('minimum');
		expect(project.lineRangeMaxColumn).toBeNull();

		project.lineRangeMaxColumn = 'minimum';
		project.validateLineRangeColumns();
		expect(project.lineRangeMaxColumn).toBeNull();

		project.csvText = 'date,mean\n2025-01-01,20';
		project.validateLineRangeColumns();
		expect(project.lineRangeMinColumn).toBeNull();
	});

	it('reset restores line range defaults', () => {
		const project = createProject();
		project.lineRangeMinColumn = 'minimum';
		project.lineRangeMaxColumn = 'maximum';
		project.lineRangeOpacity = 0.8;
		project.reset();

		expect(project.lineRangeMinColumn).toBeNull();
		expect(project.lineRangeMaxColumn).toBeNull();
		expect(project.lineRangeOpacity).toBe(0.2);
	});
});

describe('StratifyPlotProject — scatter fields', () => {
	it('uses the documented defaults', () => {
		const project = createProject();
		expect(project.scatterSizeColumn).toBeNull();
		expect(project.scatterPointRadius).toBe(4);
		expect(project.scatterMinRadius).toBe(3);
		expect(project.scatterMaxRadius).toBe(18);
		expect(project.scatterPointOpacity).toBe(0.7);
	});

	it('round-trips through JSON and preserves explicit zero values', () => {
		const project = createProject();
		project.chartType = 'scatter';
		project.scatterSizeColumn = 'demand';
		project.scatterPointRadius = 0;
		project.scatterMinRadius = 0;
		project.scatterMaxRadius = 22;
		project.scatterPointOpacity = 0;

		const restored = createProject();
		restored.loadFromSnapshot(project.toJSON());

		expect(restored.chartType).toBe('scatter');
		expect(restored.scatterSizeColumn).toBe('demand');
		expect(restored.scatterPointRadius).toBe(0);
		expect(restored.scatterMinRadius).toBe(0);
		expect(restored.scatterMaxRadius).toBe(22);
		expect(restored.scatterPointOpacity).toBe(0);
	});

	it('reset restores scatter defaults', () => {
		const project = createProject();
		project.scatterSizeColumn = 'demand';
		project.scatterPointRadius = 9;
		project.scatterMinRadius = 5;
		project.scatterMaxRadius = 30;
		project.scatterPointOpacity = 0.2;
		project.reset();

		expect(project.scatterSizeColumn).toBeNull();
		expect(project.scatterPointRadius).toBe(4);
		expect(project.scatterMinRadius).toBe(3);
		expect(project.scatterMaxRadius).toBe(18);
		expect(project.scatterPointOpacity).toBe(0.7);
	});

	it('excludes the selected size column from rendered Y series', () => {
		const project = createProject();
		project.csvText = 'x,nsw,vic,nem\n14,6900,4700,21100\n16,7100,4900,21800';
		project.displayMode = 'linear';
		project.chartType = 'scatter';
		project.scatterSizeColumn = 'nem';

		expect(project.orderedSeriesNames).toEqual(['nsw', 'vic']);
		expect(project.visibleSeriesNames).toEqual(['nsw', 'vic']);
		expect(project.visibleData[0].nem).toBe(21100);
	});

	it('restores the size column as a Y series outside scatter mode', () => {
		const project = createProject();
		project.csvText = 'x,nsw,nem\n14,6900,21100';
		project.displayMode = 'linear';
		project.scatterSizeColumn = 'nem';
		project.chartType = 'line';

		expect(project.orderedSeriesNames).toEqual(['nsw', 'nem']);
	});

	it('clears the size mapping when its numeric column disappears', () => {
		const project = createProject();
		project.csvText = 'x,y,size\n1,2,10\n2,3,20';
		project.displayMode = 'linear';
		project.scatterSizeColumn = 'size';
		project.validateScatterSizeColumn();
		expect(project.scatterSizeColumn).toBe('size');

		project.csvText = 'x,y\n1,2\n2,3';
		project.validateScatterSizeColumn();
		expect(project.scatterSizeColumn).toBeNull();
	});

	it('loads the built-in bubble scatter example with its configured mapping', () => {
		const example = examples.find((item) => item.chartType === 'scatter');
		expect(example).toBeDefined();
		const project = createProject();
		project.loadExample(/** @type {any} */ (example));

		expect(project.chartType).toBe('scatter');
		expect(project.displayMode).toBe('linear');
		expect(project.scatterSizeColumn).toBe('nem_demand_mw');
		expect(project.visibleSeriesNames).toEqual(['nsw_demand_mw', 'vic_demand_mw']);
	});

	it('keeps legacy dot snapshot migration unchanged', () => {
		const project = createProject();
		project.loadFromSnapshot(/** @type {any} */ ({ chartType: 'dot' }));
		expect(project.chartType).toBe('line');
	});
});
