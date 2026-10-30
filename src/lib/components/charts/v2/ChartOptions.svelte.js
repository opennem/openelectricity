/**
 * Chart Options Store
 *
 * Manages chart configuration options including:
 * - Data transform type (absolute, proportion, change since, growth)
 * - Curve interpolation type
 * - Chart type (stacked-area, area, line)
 * - Unit prefixes
 */

import { curveStepAfter, curveLinear, curveMonotoneX } from 'd3-shape';
import { transformToProportion, transformToChangeSince } from '$lib/utils/data-transform';

/** @typedef {'absolute' | 'proportion' | 'changeSince' | 'growth'} DataTransformType */
/** @typedef {import('$lib/utils/data-transform/growth.js').GrowthComparison} GrowthComparison */
/** @typedef {'smooth' | 'straight' | 'step'} CurveType */
/** @typedef {'stacked-area' | 'area' | 'line' | 'grouped-bar' | 'bar-stacked'} ChartType */

const DEFAULT_DATA_TRANSFORM_TYPE = /** @type {DataTransformType} */ ('absolute');
const DEFAULT_CURVE_TYPE = /** @type {CurveType} */ ('straight');
const DEFAULT_CHART_TYPE = /** @type {ChartType} */ ('stacked-area');

/**
 * @typedef {Object} ChartOptionsConfig
 * @property {DataTransformType} [dataTransformType]
 * @property {CurveType} [curveType]
 * @property {ChartType} [chartType]
 * @property {SiPrefix[]} [allowedPrefixes]
 * @property {string} [baseUnit]
 * @property {SiPrefix} [prefix]
 * @property {SiPrefix} [displayPrefix]
 */

const BASE_DATA_TRANSFORM_OPTIONS = Object.freeze([
	{ label: 'Absolute', value: /** @type {DataTransformType} */ ('absolute') },
	{ label: 'Proportion', value: /** @type {DataTransformType} */ ('proportion') },
	{ label: 'Change since', value: /** @type {DataTransformType} */ ('changeSince') }
]);
const GROWTH_DATA_TRANSFORM_OPTIONS = Object.freeze([
	...BASE_DATA_TRANSFORM_OPTIONS,
	{ label: 'Growth', value: /** @type {DataTransformType} */ ('growth') }
]);

export default class ChartOptions {
	/** How growth is measured at the current grain (set by the chart owner);
	 *  null while growth isn't offered, e.g. at sub-hourly power grains.
	 *  @type {GrowthComparison | null} */
	growthComparison = $state.raw(null);

	// Data transform options
	dataTransformOptions = $derived(
		this.growthComparison ? GROWTH_DATA_TRANSFORM_OPTIONS : BASE_DATA_TRANSFORM_OPTIONS
	);

	/** Per-row transforms; growth is row-relative and computed by the store.
	 * @type {Record<DataTransformType, Function>} */
	#dataTransformFunctions = Object.freeze({
		absolute: (/** @type {{datapoint: TimeSeriesData}} */ { datapoint }) => datapoint,
		proportion: transformToProportion,
		changeSince: transformToChangeSince,
		growth: (/** @type {{datapoint: TimeSeriesData}} */ { datapoint }) => datapoint
	});

	/** The user's (or a restored) choice, kept while it doesn't apply.
	 * @type {DataTransformType} */
	selectedDataTransformType = $state(DEFAULT_DATA_TRANSFORM_TYPE);

	/** User-selection callback; direct assignments restore state without emitting.
	 * @type {((type: DataTransformType) => void) | undefined} */
	onDataTransformChange;

	/** The transform in effect: a growth choice shows absolute values wherever
	 *  growth isn't offered, and returns when the grain offers it again. */
	dataTransformType = $derived(
		this.selectedDataTransformType === 'growth' && !this.growthComparison
			? DEFAULT_DATA_TRANSFORM_TYPE
			: this.selectedDataTransformType
	);

	dataTransformFunction = $derived(this.#dataTransformFunctions[this.dataTransformType]);
	isDataTransformTypeProportion = $derived(this.dataTransformType === 'proportion');
	isDataTransformTypeChangeSince = $derived(this.dataTransformType === 'changeSince');
	isDataTransformTypeGrowth = $derived(this.dataTransformType === 'growth');

	// Curve options
	// Note: "Step" uses curveStepAfter — the value at time T is drawn as a
	// horizontal bar from T to T+I (interval-start convention). This matches
	// calendar-aligned buckets ("1 June" bar spans all of June). The last
	// point is given a phantom trailing partner in StackedAreaChart so it
	// also renders a full-width bar.
	curveOptions = Object.freeze([
		{ label: 'Smooth', value: /** @type {CurveType} */ ('smooth') },
		{ label: 'Straight', value: /** @type {CurveType} */ ('straight') },
		{ label: 'Step', value: /** @type {CurveType} */ ('step') }
	]);

	/** @type {Record<CurveType, Function>} */
	#curveFunctions = Object.freeze({
		smooth: curveMonotoneX,
		straight: curveLinear,
		step: curveStepAfter
	});

	/** @type {CurveType} */
	selectedCurveType = $state(DEFAULT_CURVE_TYPE);

	/** Growth is one value per whole bucket, so it is always drawn stepped:
	 *  joining buckets would imply a continuous change. */
	isCurveLocked = $derived(this.isDataTransformTypeGrowth);
	curveType = $derived(
		this.isCurveLocked ? /** @type {CurveType} */ ('step') : this.selectedCurveType
	);

	curveFunction = $derived(this.#curveFunctions[this.curveType]);

	// Chart type options
	chartTypeOptions = Object.freeze([
		{ label: 'Stacked Area', value: /** @type {ChartType} */ ('stacked-area') },
		{ label: 'Line', value: /** @type {ChartType} */ ('line') }
	]);

	/** @type {ChartType} */
	selectedChartType = $state(DEFAULT_CHART_TYPE);

	isChartTypeStackedArea = $derived(this.selectedChartType === 'stacked-area');
	isChartTypeArea = $derived(this.selectedChartType === 'area');
	isChartTypeLine = $derived(this.selectedChartType === 'line');
	isChartTypeGroupedBar = $derived(this.selectedChartType === 'grouped-bar');
	isChartTypeBarStacked = $derived(this.selectedChartType === 'bar-stacked');
	isAnyBarType = $derived(
		this.selectedChartType === 'grouped-bar' || this.selectedChartType === 'bar-stacked'
	);
	isAnyStackedType = $derived(
		this.selectedChartType === 'stacked-area' || this.selectedChartType === 'bar-stacked'
	);

	// Hover-dim option — when true, hovering a series dims the others. Default off:
	// hovering no longer dims the rest of the stack; the tooltip still highlights the
	// hovered series row (driven independently by `hoverKey`, see buildSeriesRows).
	/** @type {boolean} */
	allowHoverHighlight = $state(false);

	// Unit configuration
	/** @type {SiPrefix[]} */
	allowedPrefixes = $state([]);

	allowPrefixSwitch = $derived(this.allowedPrefixes && this.allowedPrefixes.length > 1);

	/** @type {string} */
	baseUnit = $state('');

	/** @type {SiPrefix} */
	prefix = $state('');

	/** @type {SiPrefix} */
	displayPrefix = $state('');

	/** Whether the current display prefix came from an explicit user choice. */
	hasManualDisplayPrefix = $state(false);

	displayUnit = $derived((this.displayPrefix || '') + this.baseUnit);

	/**
	 * @param {ChartOptionsConfig} [config]
	 */
	constructor(config = {}) {
		const {
			dataTransformType = DEFAULT_DATA_TRANSFORM_TYPE,
			curveType = DEFAULT_CURVE_TYPE,
			chartType = DEFAULT_CHART_TYPE,
			allowedPrefixes = [],
			baseUnit = '',
			prefix = '',
			displayPrefix = ''
		} = config;

		this.selectedDataTransformType = dataTransformType;
		this.selectedCurveType = curveType;
		this.selectedChartType = chartType;
		this.allowedPrefixes = allowedPrefixes;
		this.baseUnit = baseUnit;
		this.prefix = prefix;
		this.displayPrefix = displayPrefix || prefix;
	}

	// Convenience setters
	setDataTransformType(/** @type {DataTransformType} */ type) {
		if (type === this.selectedDataTransformType) return;
		this.selectedDataTransformType = type;
		this.onDataTransformChange?.(type);
	}

	setCurveType(/** @type {CurveType} */ type) {
		this.selectedCurveType = type;
	}

	setChartType(/** @type {ChartType} */ type) {
		this.selectedChartType = type;
	}

	setDisplayPrefix(/** @type {SiPrefix} */ prefix) {
		this.displayPrefix = prefix;
		this.hasManualDisplayPrefix = true;
	}

	/** Apply a data-driven default until the user chooses a unit explicitly. */
	setAutomaticDisplayPrefix(/** @type {SiPrefix} */ prefix) {
		if (!this.hasManualDisplayPrefix) this.displayPrefix = prefix;
	}

	/** Start a new unit family (for example power → energy) at its default. */
	resetDisplayPrefix(/** @type {SiPrefix} */ prefix) {
		this.hasManualDisplayPrefix = false;
		this.displayPrefix = prefix;
	}

	/**
	 * Cycle to the next available prefix
	 * @returns {SiPrefix} The new display prefix
	 */
	cyclePrefix() {
		if (!this.allowedPrefixes.length) return this.displayPrefix;

		const currentIndex = this.allowedPrefixes.indexOf(this.displayPrefix);
		const nextIndex = (currentIndex + 1) % this.allowedPrefixes.length;
		this.setDisplayPrefix(this.allowedPrefixes[nextIndex]);
		return this.displayPrefix;
	}
}
