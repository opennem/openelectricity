/**
 * Stratify Plot Project State
 *
 * Centralised reactive state for the new Stratify builder (Plot-based).
 * Contains all authoring state — no ChartStore/Stratum dependency.
 */

import { parseCSV } from '$lib/stratify/csv-parser.js';
import { getPreset, migratePreset } from '$lib/stratify/chart-styles.js';
import { assignPaletteColours, migratePresetToPalette } from '$lib/stratify/colour-palettes.js';
import { migrateChartType, HORIZONTAL_TYPES } from '$lib/stratify/chart-types.js';

/**
 * @typedef {import('$lib/stratify/chart-types.js').ChartType} ChartType
 */

/**
 * @typedef {Object} StratifyPlotSnapshot
 * @property {number} version
 * @property {string} csvText
 * @property {string} title
 * @property {string} description
 * @property {string} dataSource
 * @property {string} notes
 * @property {ChartType} chartType
 * @property {'auto' | 'time-series' | 'category' | 'linear'} [displayMode]
 * @property {string} stylePreset
 * @property {string} [colourPalette]
 * @property {string[]} hiddenSeries
 * @property {Record<string, string>} userSeriesColours
 * @property {Record<string, string>} userSeriesLabels
 * @property {Record<string, string>} [seriesChartTypes]
 * @property {Record<string, string>} [seriesLineStyles]
 * @property {import('$lib/stratify/plot-overrides.js').PlotOverrides | null} [plotOverrides]
 * @property {string[]} [seriesOrder]
 * @property {number} [chartHeight]
 * @property {boolean} [showXTickLabels]
 * @property {number} [xTicks]
 * @property {number} [xTickRotate]
 * @property {number} [marginBottom]
 * @property {number} [marginLeft]
 * @property {number} [yTicks]
 * @property {boolean} [yMinMax]
 * @property {number | null} [y1Min]
 * @property {number | null} [y1Max]
 * @property {number} [y2Ticks]
 * @property {boolean} [y2MinMax]
 * @property {number | null} [y2Min]
 * @property {number | null} [y2Max]
 * @property {string | null} [colourSeries]
 * @property {string | null} [facetColumn]
 * @property {string} [xLabel]
 * @property {string} [yLabel]
 * @property {Record<string, 'left' | 'right'>} [seriesYAxis]
 * @property {string} [y2Label]
 * @property {string[]} [tooltipColumns]
 * @property {string} [xColumn]
 * @property {'none' | 'cumulative'} [dataTransform]
 * @property {'default' | 'x-asc' | 'x-desc' | 'value-asc' | 'value-desc'} [categorySort]
 * @property {boolean} [showLegend]
 * @property {boolean} [showBranding]
 */

export default class StratifyPlotProject {
	// --- Data ---
	/** @type {string} */
	csvText = $state('');

	// --- Metadata ---
	/** @type {string} */
	title = $state('');

	/** @type {string} */
	description = $state('');

	/** @type {string} */
	dataSource = $state('');

	/** @type {string} */
	notes = $state('');

	// --- Chart config ---
	/** @type {'auto' | 'time-series' | 'category' | 'linear'} */
	displayMode = $state('auto');

	/** @type {ChartType} */
	chartType = $state('line');

	/** @type {string} */
	stylePreset = $state('sans');

	/** @type {string} Colour palette ID */
	colourPalette = $state('oe-energy');

	// --- Series customisation ---
	/** @type {string[]} */
	hiddenSeries = $state([]);

	/** @type {Record<string, string>} */
	userSeriesColours = $state({});

	/** @type {Record<string, string>} */
	userSeriesLabels = $state({});

	/** @type {Record<string, string>} Per-series chart type override (right-axis series only) */
	seriesChartTypes = $state({});

	/** @type {Record<string, string>} Per-series line style override */
	seriesLineStyles = $state({});

	/** @type {import('$lib/stratify/plot-overrides.js').PlotOverrides | null} */
	plotOverrides = $state(null);

	/** @type {string[]} User-defined series order (empty = use CSV column order) */
	seriesOrder = $state([]);

	/** @type {number} Chart height in pixels */
	chartHeight = $state(250);

	/** @type {boolean} Show the colour legend */
	showLegend = $state(true);

	/** @type {boolean} Show x-axis tick labels */
	showXTickLabels = $state(true);

	/** @type {number} Number of x-axis ticks to show (0 = auto) */
	xTicks = $state(0);

	/** @type {number} X-axis label rotation in degrees (0 = horizontal) */
	xTickRotate = $state(0);

	/** @type {number} Bottom margin for x-axis labels in pixels (0 = auto) */
	marginBottom = $state(0);

	/** @type {number} Left margin for y-axis labels in pixels (0 = auto) */
	marginLeft = $state(0);

	/** @type {number} Number of y-axis ticks to show (0 = auto) */
	yTicks = $state(0);

	/** @type {boolean} Show min/max tick marks on left Y-axis */
	yMinMax = $state(false);

	/** @type {number | null} Manual left Y-axis lower bound (null = auto) */
	y1Min = $state(null);

	/** @type {number | null} Manual left Y-axis upper bound (null = auto) */
	y1Max = $state(null);

	/** @type {number} Number of right y-axis ticks to show (0 = auto) */
	y2Ticks = $state(0);

	/** @type {boolean} Show min/max tick marks on right Y-axis */
	y2MinMax = $state(false);

	/** @type {number | null} Manual right Y-axis lower bound (null = auto) */
	y2Min = $state(null);

	/** @type {number | null} Manual right Y-axis upper bound (null = auto) */
	y2Max = $state(null);

	/** @type {'none' | 'cumulative'} Data transform to apply */
	dataTransform = $state('none');

	/** @type {'default' | 'x-asc' | 'x-desc' | 'value-asc' | 'value-desc'} Category sort order */
	categorySort = $state('default');

	/** @type {string[]} Columns to show in tooltip (empty = show all) */
	tooltipColumns = $state([]);

	// --- Column mapping ---
	/** @type {string} Column key to use as X axis (empty = first column) */
	xColumn = $state('');

	/** @type {string | null} Column key used as colour grouping */
	colourSeries = $state(null);

	/** @type {string | null} Column key used to partition into small-multiple panels (Plot fx) */
	facetColumn = $state(null);

	// --- Axis labels ---
	/** @type {string} X-axis label (empty = hidden) */
	xLabel = $state('');

	/** @type {string} Y-axis label (empty = hidden) */
	yLabel = $state('');

	/** @type {Record<string, 'left' | 'right'>} Per-series Y-axis assignment */
	seriesYAxis = $state({});

	/** @type {string} Right Y-axis label (empty = hidden) */
	y2Label = $state('');

	/** Whether any series is assigned to the right Y-axis */
	hasRightAxis = $derived(Object.values(this.seriesYAxis).some((v) => v === 'right'));

	// --- Publish settings ---
	/** @type {'draft' | 'published'} */
	status = $state('draft');

	/** @type {boolean} */
	showBranding = $state(true);

	// --- Session tracking (not serialised) ---
	/** @type {string | null} */
	currentChartId = $state(null);

	// --- Derived from CSV ---
	parsedData = $derived(parseCSV(this.csvText, {}, this.displayMode, this.xColumn || 0));

	hasData = $derived(this.parsedData.data.length > 0);

	isCategory = $derived(this.parsedData.mode === 'category');

	isLinear = $derived(this.parsedData.mode === 'linear');

	/** All column metadata from the parser */
	allColumns = $derived(this.parsedData.allColumns ?? []);

	/** Labels for all non-first data columns (for tooltips) */
	dataColumnLabels = $derived(
		Object.fromEntries(this.allColumns.slice(1).map((col) => [col.key, col.label]))
	);

	/** Whether a valid colour series is configured */
	hasColourSeries = $derived(
		this.colourSeries !== null && this.parsedData.seriesNames.includes(this.colourSeries)
	);

	/** Unique group values from the colour series column, in data order */
	colourGroupNames = $derived.by(() => {
		if (!this.hasColourSeries) return [];
		/** @type {Set<string>} */
		const seen = new Set();
		/** @type {string[]} */
		const groups = [];
		for (const row of this.parsedData.data) {
			const val = row[/** @type {string} */ (this.colourSeries)];
			if (val != null && !seen.has(String(val))) {
				seen.add(String(val));
				groups.push(String(val));
			}
		}
		return groups;
	});

	/** Merged colours: user overrides > preset palette > parsed defaults.
	 *  When colour series is active, keys are group names (e.g. NEM, WEM). */
	seriesColours = $derived.by(() => {
		const parsed = this.parsedData;
		const names = this.hasColourSeries ? this.colourGroupNames : parsed.seriesNames;
		if (names.length === 0) return this.userSeriesColours;

		const presetColours = assignPaletteColours(names, this.colourPalette);

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of names) {
			merged[name] =
				this.userSeriesColours[name] || presetColours[name] || parsed.seriesColours[name];
		}
		return merged;
	});

	/** Merged labels: user overrides take precedence over parsed defaults.
	 *  When colour series is active, keys are group names. */
	seriesLabels = $derived.by(() => {
		const parsed = this.parsedData;
		const names = this.hasColourSeries ? this.colourGroupNames : parsed.seriesNames;
		if (names.length === 0) return this.userSeriesLabels;

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of names) {
			merged[name] = this.userSeriesLabels[name] || parsed.seriesLabels[name] || name;
		}
		return merged;
	});

	/** The active style preset config */
	activePreset = $derived(getPreset(this.stylePreset));

	/**
	 * Series names in user-defined order, excluding the colour-series and facet
	 * columns. Falls back to CSV column order. Handles additions/removals when
	 * CSV changes.
	 */
	orderedSeriesNames = $derived.by(() => {
		const colourKey = this.colourSeries;
		const facetKey = this.facetColumn;
		const parsed = this.parsedData.seriesNames.filter((n) => n !== colourKey && n !== facetKey);
		if (this.seriesOrder.length === 0) return parsed;

		const parsedSet = new Set(parsed);
		// Keep only names that still exist in the parsed data, in user order
		const ordered = this.seriesOrder.filter((name) => parsedSet.has(name));
		// Append any new series not in the user order
		const orderedSet = new Set(ordered);
		for (const name of parsed) {
			if (!orderedSet.has(name)) ordered.push(name);
		}
		return ordered;
	});

	/** Visible series names (excluding hidden), respecting user order */
	visibleSeriesNames = $derived(
		this.orderedSeriesNames.filter((name) => !this.hiddenSeries.includes(name))
	);

	/** Visible data rows with hidden series stripped */
	visibleData = $derived.by(() => {
		if (!this.hasData) return [];
		const hidden = new Set(this.hiddenSeries);
		if (hidden.size === 0) return this.parsedData.data;

		return this.parsedData.data.map((row) => {
			/** @type {Record<string, any>} */
			const filtered = {};
			for (const [key, value] of Object.entries(row)) {
				if (!hidden.has(key)) filtered[key] = value;
			}
			return filtered;
		});
	});

	constructor() {
		// Auto-switch chart type when data mode changes
		$effect(() => {
			if (this.isCategory) {
				if (this.chartType === 'area') {
					this.chartType = 'column';
				}
			}
		});

		// Clear colour series if the column no longer exists in parsed data
		$effect(() => {
			if (this.colourSeries && !this.parsedData.seriesNames.includes(this.colourSeries)) {
				this.colourSeries = null;
			}
		});

		// Clear facet column if the column no longer exists in parsed data
		$effect(() => {
			if (this.facetColumn && !this.parsedData.seriesNames.includes(this.facetColumn)) {
				this.facetColumn = null;
			}
		});

		// Recover from a stale Y selection: when a column moves into the
		// facet/colour pickers (or stops being numeric) the previous Y
		// selection's hiddenSeries can leave every eligible series hidden,
		// so the chart renders nothing. Reset hiddenSeries to "all visible"
		// in that case so the picker falls back to "All".
		$effect(() => {
			const facet = this.facetColumn;
			const colour = this.colourSeries;
			const eligible = this.allColumns
				.slice(1)
				.filter((c) => c.isNumeric && c.key !== facet && c.key !== colour)
				.map((c) => c.key);
			if (eligible.length === 0) return;
			const allHidden = eligible.every((k) => this.hiddenSeries.includes(k));
			if (allHidden) this.hiddenSeries = [];
		});
	}

	/** Reset the project to a blank state. */
	reset() {
		this.csvText = '';
		this.title = '';
		this.description = '';
		this.dataSource = '';
		this.notes = '';
		this.displayMode = 'auto';
		this.chartType = 'line';
		this.stylePreset = 'sans';
		this.colourPalette = 'oe-energy';
		this.hiddenSeries = [];
		this.userSeriesColours = {};
		this.userSeriesLabels = {};
		this.seriesChartTypes = {};
		this.seriesLineStyles = {};
		this.plotOverrides = null;
		this.seriesOrder = [];
		this.chartHeight = 250;
		this.showXTickLabels = true;
		this.xTicks = 0;
		this.xTickRotate = 0;
		this.marginBottom = 0;
		this.marginLeft = 0;
		this.yTicks = 0;
		this.yMinMax = false;
		this.y1Min = null;
		this.y1Max = null;
		this.y2Ticks = 0;
		this.y2MinMax = false;
		this.y2Min = null;
		this.y2Max = null;
		this.tooltipColumns = [];
		this.dataTransform = 'none';
		this.categorySort = 'default';
		this.xColumn = '';
		this.colourSeries = null;
		this.facetColumn = null;
		this.xLabel = '';
		this.yLabel = '';
		this.seriesYAxis = {};
		this.y2Label = '';
		this.status = 'draft';
		this.showLegend = true;
		this.showBranding = true;
		this.currentChartId = null;
	}

	/**
	 * Load an example dataset into the project.
	 * @param {{ csvData: string, title: string, description: string, dataSource: string, notes: string, chartType?: string }} example
	 */
	loadExample(example) {
		this.reset();
		this.csvText = example.csvData;
		this.title = example.title;
		this.description = example.description;
		this.dataSource = example.dataSource;
		this.notes = example.notes;
		if (example.chartType) {
			this.chartType = /** @type {ChartType} */ (example.chartType);
		}
	}

	/**
	 * Serialise the project to a plain object for persistence.
	 * @returns {StratifyPlotSnapshot}
	 */
	toJSON() {
		return {
			version: 2,
			csvText: this.csvText,
			title: this.title,
			description: this.description,
			dataSource: this.dataSource,
			notes: this.notes,
			chartType: this.chartType,
			displayMode: this.displayMode,
			stylePreset: this.stylePreset,
			colourPalette: this.colourPalette,
			hiddenSeries: this.hiddenSeries,
			userSeriesColours: this.userSeriesColours,
			userSeriesLabels: this.userSeriesLabels,
			seriesChartTypes: this.seriesChartTypes,
			seriesLineStyles: this.seriesLineStyles,
			plotOverrides: this.plotOverrides,
			seriesOrder: this.seriesOrder,
			chartHeight: this.chartHeight,
			showXTickLabels: this.showXTickLabels,
			xTicks: this.xTicks,
			xTickRotate: this.xTickRotate,
			marginBottom: this.marginBottom,
			marginLeft: this.marginLeft,
			yTicks: this.yTicks,
			yMinMax: this.yMinMax,
			y1Min: this.y1Min,
			y1Max: this.y1Max,
			y2Ticks: this.y2Ticks,
			y2MinMax: this.y2MinMax,
			y2Min: this.y2Min,
			y2Max: this.y2Max,
			tooltipColumns: this.tooltipColumns,
			dataTransform: this.dataTransform,
			categorySort: this.categorySort,
			xColumn: this.xColumn,
			colourSeries: this.colourSeries,
			facetColumn: this.facetColumn,
			xLabel: this.xLabel,
			yLabel: this.yLabel,
			seriesYAxis: this.seriesYAxis,
			y2Label: this.y2Label,
			showLegend: this.showLegend,
			showBranding: this.showBranding
		};
	}

	/**
	 * Populate this project from a snapshot (or Sanity chart document).
	 * @param {StratifyPlotSnapshot & Record<string, any>} snapshot
	 */
	loadFromSnapshot(snapshot) {
		this.csvText = snapshot.csvText ?? '';
		this.title = snapshot.title ?? '';
		this.description = snapshot.description ?? '';
		this.dataSource = snapshot.dataSource ?? '';
		this.notes = snapshot.notes ?? '';
		this.chartType = migrateChartType(snapshot.chartType ?? 'line');
		this.displayMode = snapshot.displayMode ?? 'auto';
		this.stylePreset = migratePreset(snapshot.stylePreset ?? 'sans');
		this.colourPalette =
			snapshot.colourPalette ?? migratePresetToPalette(snapshot.stylePreset ?? 'oe');
		this.hiddenSeries = snapshot.hiddenSeries ?? [];
		this.userSeriesColours = snapshot.userSeriesColours ?? {};
		this.userSeriesLabels = snapshot.userSeriesLabels ?? {};
		this.seriesChartTypes = snapshot.seriesChartTypes ?? {};
		this.seriesLineStyles = snapshot.seriesLineStyles ?? {};
		this.plotOverrides = snapshot.plotOverrides ?? null;
		this.seriesOrder = snapshot.seriesOrder ?? [];
		this.chartHeight = snapshot.chartHeight ?? 250;
		this.showXTickLabels = snapshot.showXTickLabels ?? true;
		this.xTicks = snapshot.xTicks ?? 0;
		this.xTickRotate = snapshot.xTickRotate ?? 0;
		this.marginBottom = snapshot.marginBottom ?? 0;
		this.marginLeft = snapshot.marginLeft ?? 0;
		this.yTicks = snapshot.yTicks ?? 0;
		this.yMinMax = snapshot.yMinMax ?? false;
		this.y1Min = snapshot.y1Min ?? null;
		this.y1Max = snapshot.y1Max ?? null;
		this.y2Ticks = snapshot.y2Ticks ?? 0;
		this.y2MinMax = snapshot.y2MinMax ?? false;
		this.y2Min = snapshot.y2Min ?? null;
		this.y2Max = snapshot.y2Max ?? null;
		this.tooltipColumns = snapshot.tooltipColumns ?? [];
		this.dataTransform = snapshot.dataTransform ?? 'none';
		this.categorySort = snapshot.categorySort ?? 'default';
		this.xColumn = snapshot.xColumn ?? '';
		this.colourSeries = snapshot.colourSeries ?? null;
		this.facetColumn = snapshot.facetColumn ?? null;
		this.xLabel = snapshot.xLabel ?? '';
		this.yLabel = snapshot.yLabel ?? '';
		this.seriesYAxis = snapshot.seriesYAxis ?? {};
		this.y2Label = snapshot.y2Label ?? '';
		this.status = snapshot.status ?? 'draft';
		this.showLegend = snapshot.showLegend ?? true;
		this.showBranding = snapshot.showBranding ?? true;
	}
}
