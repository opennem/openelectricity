/**
 * Stratify Plot Project State
 *
 * Centralised reactive state for the new Stratify builder (Plot-based).
 * Contains all authoring state — no ChartStore/Stratum dependency.
 */

import { parseCSV } from '$lib/stratify/csv-parser.js';
import { getPreset, migratePreset } from '$lib/stratify/chart-styles.js';
import {
	assignPaletteColours,
	migratePresetToPalette,
	getPaletteSwatchColours
} from '$lib/stratify/colour-palettes.js';
import {
	migrateChartType,
	HORIZONTAL_TYPES,
	WATERFALL_TYPES,
	WATERFALL_ROLE_KEYS,
	WATERFALL_ROLE_LABELS,
	getWaterfallRoleColours
} from '$lib/stratify/chart-types.js';
import { uniqueColumnValues } from '$lib/stratify/chart-data.js';
import {
	compileAnnotationItems,
	createAnnotationItem,
	DEFAULT_ANNOTATION_STYLE
} from '$lib/stratify/annotation-data.js';
import {
	detectLatColumn,
	detectLngColumn,
	detectLabelColumn
} from '$lib/stratify/map-detection.js';

/**
 * @typedef {import('$lib/stratify/chart-types.js').ChartType} ChartType
 */

/**
 * @typedef {Object} StratifyPlotSnapshot
 * @property {number} version
 * @property {string} csvText
 * @property {import('$lib/stratify/annotation-data.js').AnnotationItem[]} [annotationItems]
 * @property {import('$lib/stratify/annotation-data.js').AnnotationStyleConfig} [annotationStyle]
 * @property {import('$lib/stratify/plot-annotations.js').Annotation[]} [annotations]
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
 * @property {number} [facetPanelsPerRow]
 * @property {boolean} [animateAsOneChart]
 * @property {number} [animationSpeedMs]
 * @property {boolean} [animationAutoLoop]
 * @property {boolean} [animationAutoPlay]
 * @property {boolean} [animationTween]
 * @property {string} [chartCurve]
 * @property {string | null} [lineRangeMinColumn]
 * @property {string | null} [lineRangeMaxColumn]
 * @property {number} [lineRangeOpacity]
 * @property {string | null} [scatterSizeColumn]
 * @property {number} [scatterPointRadius]
 * @property {number} [scatterMinRadius]
 * @property {number} [scatterMaxRadius]
 * @property {number} [scatterPointOpacity]
 * @property {'single' | 'sum' | 'stacked'} [waterfallMode]
 * @property {boolean} [waterfallShowTotal]
 * @property {'semantic' | 'series'} [waterfallColourMode]
 * @property {string} [valueFormat]
 * @property {number} [chartBorderWidth]
 * @property {string} [chartBorderColour]
 * @property {string} [xLabel]
 * @property {string} [yLabel]
 * @property {Record<string, 'left' | 'right'>} [seriesYAxis]
 * @property {string} [y2Label]
 * @property {string[]} [tooltipColumns]
 * @property {'date' | 'time' | 'date-time'} [tooltipDateFormat]
 * @property {string} [xColumn]
 * @property {'none' | 'cumulative'} [dataTransform]
 * @property {'default' | 'x-asc' | 'x-desc' | 'value-asc' | 'value-desc'} [categorySort]
 * @property {boolean} [showLegend]
 * @property {boolean} [showBranding]
 * @property {string | null} [latColumn]
 * @property {string | null} [lngColumn]
 * @property {string | null} [labelColumn]
 * @property {string | null} [sizeColumn]
 * @property {'single' | 'category' | 'range'} [mapColourMode]
 * @property {string | null} [colourColumn]
 * @property {string} [singleMarkerColour]
 * @property {string} [mapRangeMinColour]
 * @property {string} [mapRangeMaxColour]
 * @property {number} [mapMinRadius]
 * @property {number} [mapMaxRadius]
 * @property {'light' | 'dark' | 'satellite'} [mapTheme]
 */

export default class StratifyPlotProject {
	// --- Data ---
	/** @type {string} */
	csvText = $state('');

	/** @type {import('$lib/stratify/annotation-data.js').AnnotationItem[]} */
	annotationItems = $state([]);

	/** @type {import('$lib/stratify/annotation-data.js').AnnotationStyleConfig} */
	annotationStyle = $state({ ...DEFAULT_ANNOTATION_STYLE });

	/** @type {import('$lib/stratify/plot-annotations.js').Annotation[]} Legacy annotations */
	annotations = $state([]);

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

	/** @type {'date' | 'time' | 'date-time'} Formatting for temporal X values in chart tooltips */
	tooltipDateFormat = $state('date');

	// --- Column mapping ---
	/** @type {string} Column key to use as X axis (empty = first column) */
	xColumn = $state('');

	/** @type {string | null} Column key used as colour grouping */
	colourSeries = $state(null);

	/** @type {string | null} Column key used to partition into small-multiple panels (Plot fx) */
	facetColumn = $state(null);

	/** @type {number} Fixed number of small-multiple panels per row (0 = auto) */
	facetPanelsPerRow = $state(0);

	/** @type {boolean} When true and facetColumn is set, render a single chart that animates through the partitions instead of small multiples */
	animateAsOneChart = $state(false);

	/** @type {number} Milliseconds per facet transition when animating */
	animationSpeedMs = $state(800);

	/** @type {boolean} When true, animation loops back to the first frame after the last */
	animationAutoLoop = $state(false);

	/** @type {boolean} When true, animation begins playing automatically on mount */
	animationAutoPlay = $state(false);

	/** @type {boolean} When true, the chart smoothly interpolates between facet frames; when false, it jumps directly */
	animationTween = $state(true);

	/** @type {string} Plot curve type for line/area charts: linear, monotone-x, step, step-before, step-after, basis, natural */
	chartCurve = $state('linear');

	/** @type {string | null} Numeric CSV column used as the lower edge of a line range band */
	lineRangeMinColumn = $state(null);

	/** @type {string | null} Numeric CSV column used as the upper edge of a line range band */
	lineRangeMaxColumn = $state(null);

	/** @type {number} Line range band fill opacity */
	lineRangeOpacity = $state(0.2);

	/** @type {string | null} Numeric CSV column driving scatter bubble radius (null = fixed) */
	scatterSizeColumn = $state(null);

	/** @type {number} Fixed scatter point radius in pixels */
	scatterPointRadius = $state(4);

	/** @type {number} Minimum bubble radius in pixels */
	scatterMinRadius = $state(3);

	/** @type {number} Maximum bubble radius in pixels */
	scatterMaxRadius = $state(18);

	/** @type {number} Scatter point fill opacity */
	scatterPointOpacity = $state(0.7);

	/** @type {'single' | 'sum' | 'stacked'} Waterfall aggregation: 'single' uses the first series, 'sum' totals all series per row, 'stacked' stacks every series within each step */
	waterfallMode = $state('single');

	/** @type {boolean} Append a full-height "Total" bar (anchored at 0) to the waterfall */
	waterfallShowTotal = $state(true);

	/** @type {'semantic' | 'series'} Waterfall colour mode: 'semantic' colours by role (start/up/down/total), 'series' colours per row */
	waterfallColourMode = $state('semantic');

	/** @type {string} Displayed-value format for tooltips & annotations: '0'|'1'|'2'|'3' decimals, 'compact', or 'auto' */
	valueFormat = $state('1');

	/** @type {number} Border (stroke) width in pixels for bar, column and area marks (0 = no border) */
	chartBorderWidth = $state(0.5);

	/** @type {string} Border (stroke) colour for bar, column and area marks (CSS hex/rgba) */
	chartBorderColour = $state('#000000');

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

	// --- Map type column mapping ---
	/** @type {string | null} CSV column key for latitude (map chart type) */
	latColumn = $state(null);

	/** @type {string | null} CSV column key for longitude (map chart type) */
	lngColumn = $state(null);

	/** @type {string | null} CSV column key for marker popup title (map chart type) */
	labelColumn = $state(null);

	/** @type {string | null} Numeric CSV column key driving marker radius (null = fixed) */
	sizeColumn = $state(null);

	/** @type {'single' | 'category' | 'range'} Map marker colour strategy */
	mapColourMode = $state('single');

	/** @type {string | null} Colour column key: categorical (`category`) or numeric (`range`) */
	colourColumn = $state(null);

	/** @type {string} Single marker colour when mapColourMode === 'single' */
	singleMarkerColour = $state('#3b82f6');

	/** @type {string} Colour at the lowest value when mapColourMode === 'range' */
	mapRangeMinColour = $state('#dbeafe');

	/** @type {string} Colour at the highest value when mapColourMode === 'range' */
	mapRangeMaxColour = $state('#1e3a8a');

	/** @type {number} Minimum marker radius in pixels */
	mapMinRadius = $state(4);

	/** @type {number} Maximum marker radius in pixels */
	mapMaxRadius = $state(24);

	/** @type {'light' | 'dark' | 'satellite'} Basemap theme for map chart type */
	mapTheme = $state('light');

	/** Unique values of colourColumn, in data order — used by SeriesConfig swatches in map category mode */
	mapColourGroupNames = $derived.by(() =>
		uniqueColumnValues(this.parsedData.data, this.colourColumn).map(String)
	);

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

	compiledAnnotationData = $derived(
		compileAnnotationItems(this.annotationItems, this.parsedData.mode, this.annotationStyle)
	);

	dataAnnotations = $derived(this.compiledAnnotationData.annotations);

	annotationErrors = $derived(this.compiledAnnotationData.errors);

	annotationWarnings = $derived.by(() => {
		const warnings = [...this.compiledAnnotationData.warnings];
		for (const annotation of this.dataAnnotations) {
			if (
				annotation.type === 'point' &&
				annotation.y == null &&
				annotation.series &&
				!this.parsedData.seriesNames.some(
					(name) =>
						name.toLowerCase() === annotation.series?.toLowerCase() ||
						this.parsedData.seriesLabels[name]?.toLowerCase() === annotation.series?.toLowerCase()
				)
			) {
				warnings.push(
					`Row ${annotation.rowNumber}: could not resolve series "${annotation.series}".`
				);
			}
		}
		return warnings;
	});

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

	/** Whether the waterfall colours single/sum bars (not stacked, which is per-column) */
	isWaterfallColourable = $derived(
		WATERFALL_TYPES.has(this.chartType) &&
			(this.waterfallMode === 'single' || this.waterfallMode === 'sum')
	);

	/** Per-row colouring: each CSV row picks its own colour ('series' mode) */
	isWaterfallPerRow = $derived(this.isWaterfallColourable && this.waterfallColourMode === 'series');

	/** Semantic colouring: bars coloured by role (starting/increase/decrease/total) */
	isWaterfallSemantic = $derived(
		this.isWaterfallColourable && this.waterfallColourMode === 'semantic'
	);

	/** Row (category) keys for per-row waterfall colouring, in data order (+ Total) */
	waterfallRowNames = $derived.by(() => {
		if (!this.isWaterfallPerRow) return [];
		const key = this.isCategory ? 'category' : this.isLinear ? 'linear' : 'date';
		/** @type {Set<string>} */
		const seen = new Set();
		/** @type {string[]} */
		const names = [];
		for (const row of this.parsedData.data) {
			const name = String(row[key]);
			if (!seen.has(name)) {
				seen.add(name);
				names.push(name);
			}
		}
		if (this.waterfallShowTotal) names.push('Total');
		return names;
	});

	/** Whether the map chart is grouping markers by a category column */
	isMapCategory = $derived(
		this.chartType === 'map' && this.mapColourMode === 'category' && !!this.colourColumn
	);

	/** Merged colours: user overrides > preset palette > parsed defaults.
	 *  When colour series is active, keys are group names (e.g. NEM, WEM).
	 *  When the map chart groups by a column, keys are that column's unique values. */
	seriesColours = $derived.by(() => {
		const parsed = this.parsedData;

		// Semantic waterfall: keys are roles (starting/increase/decrease/total),
		// defaulting to the first theme colours (starting & total share one).
		if (this.isWaterfallSemantic) {
			const defaults = getWaterfallRoleColours(getPaletteSwatchColours(this.colourPalette));
			/** @type {Record<string, string>} */
			const roleMerged = {};
			for (const role of WATERFALL_ROLE_KEYS) {
				roleMerged[role] = this.userSeriesColours[role] || defaults[role];
			}
			return roleMerged;
		}

		// Per-row waterfall: keys are row categories, all defaulting to one base
		// colour (the first column's), individually overridable.
		if (this.isWaterfallPerRow) {
			const firstCol = parsed.seriesNames[0];
			const presetCols = assignPaletteColours(parsed.seriesNames, this.colourPalette);
			const base =
				this.userSeriesColours[firstCol] ||
				presetCols[firstCol] ||
				parsed.seriesColours[firstCol] ||
				'#888';
			/** @type {Record<string, string>} */
			const rowMerged = {};
			for (const name of this.waterfallRowNames) {
				rowMerged[name] = this.userSeriesColours[name] || base;
			}
			return rowMerged;
		}

		const names = this.isMapCategory
			? this.mapColourGroupNames
			: this.hasColourSeries
				? this.colourGroupNames
				: parsed.seriesNames;
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

		// Semantic waterfall: keys are roles with fixed default labels.
		if (this.isWaterfallSemantic) {
			/** @type {Record<string, string>} */
			const roleMerged = {};
			for (const role of WATERFALL_ROLE_KEYS) {
				roleMerged[role] = this.userSeriesLabels[role] || WATERFALL_ROLE_LABELS[role];
			}
			return roleMerged;
		}

		// Per-row waterfall: keys are row categories; default label is the category.
		if (this.isWaterfallPerRow) {
			/** @type {Record<string, string>} */
			const rowMerged = {};
			for (const name of this.waterfallRowNames) {
				rowMerged[name] = this.userSeriesLabels[name] || name;
			}
			return rowMerged;
		}

		const names = this.isMapCategory
			? this.mapColourGroupNames
			: this.hasColourSeries
				? this.colourGroupNames
				: parsed.seriesNames;
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
		const sizeKey = this.chartType === 'scatter' ? this.scatterSizeColumn : null;
		const hasLineRange =
			this.chartType === 'line' &&
			this.lineRangeMinColumn &&
			this.lineRangeMaxColumn &&
			this.lineRangeMinColumn !== this.lineRangeMaxColumn;
		const rangeMinKey = hasLineRange ? this.lineRangeMinColumn : null;
		const rangeMaxKey = hasLineRange ? this.lineRangeMaxColumn : null;
		const parsed = this.parsedData.seriesNames.filter(
			(n) =>
				n !== colourKey && n !== facetKey && n !== sizeKey && n !== rangeMinKey && n !== rangeMaxKey
		);
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
				if (
					!hidden.has(key) ||
					key === this.scatterSizeColumn ||
					key === this.lineRangeMinColumn ||
					key === this.lineRangeMaxColumn
				) {
					filtered[key] = value;
				}
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

		// Bubble sizing must reference an existing numeric non-X column.
		$effect(() => {
			this.validateScatterSizeColumn();
		});

		// Line range bounds must reference distinct, existing numeric non-X columns.
		$effect(() => {
			this.validateLineRangeColumns();
		});

		// Reset animate toggle when the partition column is cleared, so
		// reselecting later doesn't resurrect a previous setting silently.
		$effect(() => {
			if (!this.facetColumn && this.animateAsOneChart) {
				this.animateAsOneChart = false;
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
			const size = this.chartType === 'scatter' ? this.scatterSizeColumn : null;
			const hasLineRange =
				this.chartType === 'line' &&
				this.lineRangeMinColumn &&
				this.lineRangeMaxColumn &&
				this.lineRangeMinColumn !== this.lineRangeMaxColumn;
			const rangeMin = hasLineRange ? this.lineRangeMinColumn : null;
			const rangeMax = hasLineRange ? this.lineRangeMaxColumn : null;
			const eligible = this.allColumns
				.slice(1)
				.filter(
					(c) =>
						c.isNumeric &&
						c.key !== facet &&
						c.key !== colour &&
						c.key !== size &&
						c.key !== rangeMin &&
						c.key !== rangeMax
				)
				.map((c) => c.key);
			if (eligible.length === 0) return;
			const allHidden = eligible.every((k) => this.hiddenSeries.includes(k));
			if (allHidden) this.hiddenSeries = [];
		});

		// Auto-detect lat/lng/label whenever the chart is in map mode and the
		// columns aren't set yet. Lives on the project (not ChartPanel) so it
		// runs even when the Chart accordion is collapsed.
		$effect(() => {
			if (this.chartType !== 'map') return;
			if (this.allColumns.length === 0) return;
			if (this.latColumn === null) {
				const lat = detectLatColumn(this.allColumns, this.parsedData.data);
				if (lat) this.latColumn = lat;
			}
			if (this.lngColumn === null) {
				const lng = detectLngColumn(this.allColumns, this.parsedData.data);
				if (lng) this.lngColumn = lng;
			}
			if (this.labelColumn === null) {
				const label = detectLabelColumn(this.allColumns);
				if (label) this.labelColumn = label;
			}
		});
	}

	/** Clear a scatter size mapping that no longer resolves to a numeric non-X column. */
	validateScatterSizeColumn() {
		if (!this.scatterSizeColumn) return;
		const column = this.allColumns.slice(1).find((c) => c.key === this.scatterSizeColumn);
		if (!column?.isNumeric) this.scatterSizeColumn = null;
	}

	/** Clear line range mappings that no longer resolve to distinct numeric non-X columns. */
	validateLineRangeColumns() {
		const numericKeys = this.allColumns
			.slice(1)
			.filter((column) => column.isNumeric)
			.map((column) => column.key);
		if (this.lineRangeMinColumn && !numericKeys.includes(this.lineRangeMinColumn)) {
			this.lineRangeMinColumn = null;
		}
		if (this.lineRangeMaxColumn && !numericKeys.includes(this.lineRangeMaxColumn)) {
			this.lineRangeMaxColumn = null;
		}
		if (this.lineRangeMinColumn && this.lineRangeMaxColumn === this.lineRangeMinColumn) {
			this.lineRangeMaxColumn = null;
		}
	}

	/** Add a blank item for the guided annotation builder. */
	addAnnotation() {
		const appearance = this.annotationItems[0]?.appearance ?? this.annotationStyle;
		this.annotationItems = [...this.annotationItems, createAnnotationItem(appearance)];
	}

	/**
	 * @param {string} id
	 * @param {Partial<import('$lib/stratify/annotation-data.js').AnnotationItem>} patch
	 */
	updateAnnotation(id, patch) {
		this.annotationItems = this.annotationItems.map((item) =>
			item.id === id ? { ...item, ...patch } : item
		);
	}

	/** @param {string} id */
	removeAnnotation(id) {
		this.annotationItems = this.annotationItems.filter((item) => item.id !== id);
	}

	/** Reset the project to a blank state. */
	reset() {
		this.csvText = '';
		this.annotationItems = [];
		this.annotationStyle = { ...DEFAULT_ANNOTATION_STYLE };
		this.annotations = [];
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
		this.tooltipDateFormat = 'date';
		this.dataTransform = 'none';
		this.categorySort = 'default';
		this.xColumn = '';
		this.colourSeries = null;
		this.facetColumn = null;
		this.facetPanelsPerRow = 0;
		this.animateAsOneChart = false;
		this.animationSpeedMs = 800;
		this.animationAutoLoop = false;
		this.animationAutoPlay = false;
		this.animationTween = true;
		this.chartCurve = 'linear';
		this.lineRangeMinColumn = null;
		this.lineRangeMaxColumn = null;
		this.lineRangeOpacity = 0.2;
		this.scatterSizeColumn = null;
		this.scatterPointRadius = 4;
		this.scatterMinRadius = 3;
		this.scatterMaxRadius = 18;
		this.scatterPointOpacity = 0.7;
		this.waterfallMode = 'single';
		this.waterfallShowTotal = true;
		this.waterfallColourMode = 'semantic';
		this.valueFormat = '1';
		this.chartBorderWidth = 0.5;
		this.chartBorderColour = '#000000';
		this.xLabel = '';
		this.yLabel = '';
		this.seriesYAxis = {};
		this.y2Label = '';
		this.status = 'draft';
		this.showLegend = true;
		this.showBranding = true;
		this.currentChartId = null;
		this.latColumn = null;
		this.lngColumn = null;
		this.labelColumn = null;
		this.sizeColumn = null;
		this.mapColourMode = 'single';
		this.colourColumn = null;
		this.singleMarkerColour = '#3b82f6';
		this.mapRangeMinColour = '#dbeafe';
		this.mapRangeMaxColour = '#1e3a8a';
		this.mapMinRadius = 4;
		this.mapMaxRadius = 24;
		this.mapTheme = 'light';
	}

	/**
	 * Load an example dataset into the project.
	 * @param {{ snapshot?: Record<string, any>, csvData?: string, title?: string, description?: string, dataSource?: string, notes?: string, chartType?: string, displayMode?: 'auto' | 'time-series' | 'category' | 'linear', xColumn?: string, scatterSizeColumn?: string | null, scatterPointRadius?: number, scatterMinRadius?: number, scatterMaxRadius?: number, scatterPointOpacity?: number }} example
	 */
	loadExample(example) {
		const snapshot = example.snapshot ?? {
			csvText: example.csvData ?? '',
			title: example.title ?? '',
			description: example.description ?? '',
			dataSource: example.dataSource ?? '',
			notes: example.notes ?? '',
			chartType: example.chartType,
			displayMode: example.displayMode,
			xColumn: example.xColumn,
			scatterSizeColumn: example.scatterSizeColumn,
			scatterPointRadius: example.scatterPointRadius,
			scatterMinRadius: example.scatterMinRadius,
			scatterMaxRadius: example.scatterMaxRadius,
			scatterPointOpacity: example.scatterPointOpacity
		};

		this.loadFromSnapshot(
			/** @type {any} */ ({
				...snapshot,
				status: 'draft'
			})
		);
		this.currentChartId = null;
	}

	/**
	 * Serialise the project to a plain object for persistence.
	 * @returns {StratifyPlotSnapshot}
	 */
	toJSON() {
		return {
			version: 2,
			csvText: this.csvText,
			annotationItems: this.annotationItems,
			annotationStyle: this.annotationStyle,
			annotations: this.annotations,
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
			tooltipDateFormat: this.tooltipDateFormat,
			dataTransform: this.dataTransform,
			categorySort: this.categorySort,
			xColumn: this.xColumn,
			colourSeries: this.colourSeries,
			facetColumn: this.facetColumn,
			facetPanelsPerRow: this.facetPanelsPerRow,
			animateAsOneChart: this.animateAsOneChart,
			animationSpeedMs: this.animationSpeedMs,
			animationAutoLoop: this.animationAutoLoop,
			animationAutoPlay: this.animationAutoPlay,
			animationTween: this.animationTween,
			chartCurve: this.chartCurve,
			lineRangeMinColumn: this.lineRangeMinColumn,
			lineRangeMaxColumn: this.lineRangeMaxColumn,
			lineRangeOpacity: this.lineRangeOpacity,
			scatterSizeColumn: this.scatterSizeColumn,
			scatterPointRadius: this.scatterPointRadius,
			scatterMinRadius: this.scatterMinRadius,
			scatterMaxRadius: this.scatterMaxRadius,
			scatterPointOpacity: this.scatterPointOpacity,
			waterfallMode: this.waterfallMode,
			waterfallShowTotal: this.waterfallShowTotal,
			waterfallColourMode: this.waterfallColourMode,
			valueFormat: this.valueFormat,
			chartBorderWidth: this.chartBorderWidth,
			chartBorderColour: this.chartBorderColour,
			xLabel: this.xLabel,
			yLabel: this.yLabel,
			seriesYAxis: this.seriesYAxis,
			y2Label: this.y2Label,
			showLegend: this.showLegend,
			showBranding: this.showBranding,
			latColumn: this.latColumn,
			lngColumn: this.lngColumn,
			labelColumn: this.labelColumn,
			sizeColumn: this.sizeColumn,
			mapColourMode: this.mapColourMode,
			colourColumn: this.colourColumn,
			singleMarkerColour: this.singleMarkerColour,
			mapRangeMinColour: this.mapRangeMinColour,
			mapRangeMaxColour: this.mapRangeMaxColour,
			mapMinRadius: this.mapMinRadius,
			mapMaxRadius: this.mapMaxRadius,
			mapTheme: this.mapTheme
		};
	}

	/**
	 * Populate this project from a snapshot (or Sanity chart document).
	 * @param {StratifyPlotSnapshot & Record<string, any>} snapshot
	 */
	loadFromSnapshot(snapshot) {
		this.csvText = snapshot.csvText ?? '';
		this.annotationItems = Array.isArray(snapshot.annotationItems) ? snapshot.annotationItems : [];
		this.annotationStyle = { ...DEFAULT_ANNOTATION_STYLE, ...(snapshot.annotationStyle ?? {}) };
		this.annotations = Array.isArray(snapshot.annotations) ? snapshot.annotations : [];
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
		this.tooltipDateFormat = snapshot.tooltipDateFormat ?? 'date';
		this.dataTransform = snapshot.dataTransform ?? 'none';
		this.categorySort = snapshot.categorySort ?? 'default';
		this.xColumn = snapshot.xColumn ?? '';
		this.colourSeries = snapshot.colourSeries ?? null;
		this.facetColumn = snapshot.facetColumn ?? null;
		this.facetPanelsPerRow = snapshot.facetPanelsPerRow ?? 0;
		this.animateAsOneChart = snapshot.animateAsOneChart ?? false;
		this.animationSpeedMs = snapshot.animationSpeedMs ?? 800;
		this.animationAutoLoop = snapshot.animationAutoLoop ?? false;
		this.animationAutoPlay = snapshot.animationAutoPlay ?? false;
		this.animationTween = snapshot.animationTween ?? true;
		this.chartCurve = snapshot.chartCurve ?? 'linear';
		this.lineRangeMinColumn = snapshot.lineRangeMinColumn ?? null;
		this.lineRangeMaxColumn = snapshot.lineRangeMaxColumn ?? null;
		this.lineRangeOpacity = snapshot.lineRangeOpacity ?? 0.2;
		this.scatterSizeColumn = snapshot.scatterSizeColumn ?? null;
		this.scatterPointRadius = snapshot.scatterPointRadius ?? 4;
		this.scatterMinRadius = snapshot.scatterMinRadius ?? 3;
		this.scatterMaxRadius = snapshot.scatterMaxRadius ?? 18;
		this.scatterPointOpacity = snapshot.scatterPointOpacity ?? 0.7;
		this.waterfallMode = snapshot.waterfallMode ?? 'single';
		this.waterfallShowTotal = snapshot.waterfallShowTotal ?? true;
		this.waterfallColourMode = snapshot.waterfallColourMode ?? 'semantic';
		this.valueFormat = snapshot.valueFormat ?? '1';
		this.chartBorderWidth = snapshot.chartBorderWidth ?? 0.5;
		this.chartBorderColour = snapshot.chartBorderColour ?? '#000000';
		this.xLabel = snapshot.xLabel ?? '';
		this.yLabel = snapshot.yLabel ?? '';
		this.seriesYAxis = snapshot.seriesYAxis ?? {};
		this.y2Label = snapshot.y2Label ?? '';
		this.status = snapshot.status ?? 'draft';
		this.showLegend = snapshot.showLegend ?? true;
		this.showBranding = snapshot.showBranding ?? true;
		this.latColumn = snapshot.latColumn ?? null;
		this.lngColumn = snapshot.lngColumn ?? null;
		this.labelColumn = snapshot.labelColumn ?? null;
		this.sizeColumn = snapshot.sizeColumn ?? null;
		this.mapColourMode = snapshot.mapColourMode ?? 'single';
		this.colourColumn = snapshot.colourColumn ?? null;
		this.singleMarkerColour = snapshot.singleMarkerColour ?? '#3b82f6';
		this.mapRangeMinColour = snapshot.mapRangeMinColour ?? '#dbeafe';
		this.mapRangeMaxColour = snapshot.mapRangeMaxColour ?? '#1e3a8a';
		this.mapMinRadius = snapshot.mapMinRadius ?? 4;
		this.mapMaxRadius = snapshot.mapMaxRadius ?? 24;
		this.mapTheme = snapshot.mapTheme ?? 'light';
	}
}
