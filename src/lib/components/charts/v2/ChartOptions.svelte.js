/**
 * Chart Options Store
 *
 * Manages chart configuration options including:
 * - Data transform type (absolute, proportion, change since)
 * - Curve interpolation type
 * - Chart type (stacked-area, area, line)
 * - Unit prefixes
 */

import { curveStepAfter, curveLinear, curveMonotoneX } from 'd3-shape';
import { transformToProportion, transformToChangeSince } from '$lib/utils/data-transform';

/** @typedef {'absolute' | 'proportion' | 'changeSince'} DataTransformType */
/** @typedef {'smooth' | 'straight' | 'step'} CurveType */
/** @typedef {'stacked-area' | 'area' | 'line'} ChartType */

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

export default class ChartOptions {
	// Data transform options
	dataTransformOptions = Object.freeze([
		{ label: 'Absolute', value: /** @type {DataTransformType} */ ('absolute') },
		{ label: 'Proportion', value: /** @type {DataTransformType} */ ('proportion') },
		{ label: 'Change since', value: /** @type {DataTransformType} */ ('changeSince') }
	]);

	/** @type {Record<DataTransformType, Function>} */
	#dataTransformFunctions = Object.freeze({
		absolute: (/** @type {{datapoint: TimeSeriesData}} */ { datapoint }) => datapoint,
		proportion: transformToProportion,
		changeSince: transformToChangeSince
	});

	/** @type {DataTransformType} */
	selectedDataTransformType = $state(DEFAULT_DATA_TRANSFORM_TYPE);

	dataTransformFunction = $derived(this.#dataTransformFunctions[this.selectedDataTransformType]);
	isDataTransformTypeProportion = $derived(this.selectedDataTransformType === 'proportion');
	isDataTransformTypeChangeSince = $derived(this.selectedDataTransformType === 'changeSince');

	// Curve options
	// Note: "Step" uses curveStepAfter (d3) which works better for time-series
	// energy data — the value at time T is drawn as a horizontal bar from T to T+1.
	// The old curveStep (centered step) was removed as it doesn't align with
	// how interval data is conventionally displayed.
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

	curveFunction = $derived(this.#curveFunctions[this.selectedCurveType]);

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

	// Hover highlight option - when false, hovering over a series won't dim other series
	/** @type {boolean} */
	allowHoverHighlight = $state(true);

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
		this.selectedDataTransformType = type;
	}

	setCurveType(/** @type {CurveType} */ type) {
		this.selectedCurveType = type;
	}

	setChartType(/** @type {ChartType} */ type) {
		this.selectedChartType = type;
	}

	setDisplayPrefix(/** @type {SiPrefix} */ prefix) {
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
		this.displayPrefix = this.allowedPrefixes[nextIndex];
		return this.displayPrefix;
	}
}
