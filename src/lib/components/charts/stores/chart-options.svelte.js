import { curveStep, curveLinear, curveMonotoneX } from 'd3-shape';
import { transformToProportion, transformToChangeSince } from '$lib/utils/data-transform';

/** @typedef {'absolute' | 'proportion' | 'changeSince'} DataTransformType */
/** @typedef {'smooth' | 'straight' | 'step'} CurveType */
/** @typedef {'area' | 'line'} ChartType */
const DEFAULT_DATA_TRANSFORM_TYPE = 'absolute';
const DEFAULT_CURVE_TYPE = 'straight';
const DEFAULT_CHART_TYPE = 'area';

export default class ChartOptionsState {
	// Data transform options
	dataTransformOptions = Object.freeze([
		{
			label: 'Absolute',
			value: 'absolute'
		},
		{
			label: 'Proportion',
			value: 'proportion'
		},
		{
			label: 'Change since',
			value: 'changeSince'
		}
	]);
	dataTransformFunctionsMap = Object.freeze({
		absolute: (/** @type {{datapoint: TimeSeriesData}} */ { datapoint }) => datapoint,
		proportion: transformToProportion,
		changeSince: transformToChangeSince
	});
	/** @type {DataTransformType} */
	selectedDataTransformType = $state(DEFAULT_DATA_TRANSFORM_TYPE);
	dataTransformFunction = $derived(this.dataTransformFunctionsMap[this.selectedDataTransformType]);
	isDataTransformTypeProportion = $derived(this.selectedDataTransformType === 'proportion');

	// Curve options
	curveOptions = Object.freeze([
		{
			label: 'Smooth',
			value: 'smooth'
		},
		{
			label: 'Straight',
			value: 'straight'
		},
		{
			label: 'Step',
			value: 'step'
		}
	]);
	curveFunctionsMap = Object.freeze({
		smooth: curveMonotoneX,
		straight: curveLinear,
		step: curveStep
	});
	/** @type {CurveType} */
	selectedCurveType = $state(DEFAULT_CURVE_TYPE);
	curveFunction = $derived(this.curveFunctionsMap[this.selectedCurveType]);

	// Chart type options
	chartTypeOptions = Object.freeze([
		{
			label: 'Area',
			value: 'area'
		},
		{
			label: 'Line',
			value: 'line'
		}
	]);
	/** @type {ChartType} */
	selectedChartType = $state(DEFAULT_CHART_TYPE);
	isChartTypeArea = $derived(this.selectedChartType === 'area');
	isChartTypeLine = $derived(this.selectedChartType === 'line');

	/** @type {SiPrefix[]} */
	allowedPrefixes = $state([]);

	/** @type {boolean} */
	allowPrefixSwitch = $derived(this.allowedPrefixes && this.allowedPrefixes.length > 1);

	/** @type {string} */
	baseUnit = $state('');

	/** @type {SiPrefix} */
	prefix = $state('');

	/** @type {SiPrefix} */
	displayPrefix = $state('');

	displayUnit = $derived((this.displayPrefix || '') + this.baseUnit);

	/** @type {boolean} */
	allowHoverHighlight = $state(true);

	/** @param {{dataTransformType?: DataTransformType, curveType?: CurveType, chartType?: ChartType, allowedPrefixes?: SiPrefix[], baseUnit?: string, prefix?: SiPrefix, displayPrefix?: SiPrefix }} params */
	constructor({
		dataTransformType = DEFAULT_DATA_TRANSFORM_TYPE,
		curveType = DEFAULT_CURVE_TYPE,
		chartType = DEFAULT_CHART_TYPE,
		allowedPrefixes = [],
		baseUnit = '',
		prefix = '',
		displayPrefix = ''
	} = {}) {
		this.selectedDataTransformType = dataTransformType;
		this.selectedCurveType = curveType;
		this.selectedChartType = chartType;
		this.allowedPrefixes = allowedPrefixes;
		this.baseUnit = baseUnit;
		this.prefix = prefix;
		this.displayPrefix = displayPrefix;
	}
}
