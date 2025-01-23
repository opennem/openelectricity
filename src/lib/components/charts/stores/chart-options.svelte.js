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
			value: 'proportion',
			dataTransformFunction: transformToProportion
		},
		{
			label: 'Change since',
			value: 'changeSince',
			dataTransformFunction: transformToChangeSince
		}
	]);
	/** @type {DataTransformType} */
	selectedDataTransformType = $state(DEFAULT_DATA_TRANSFORM_TYPE);
	dataTransformFunction = $derived.by(() => {
		const option = this.dataTransformOptions.find(
			(d) => d.value === this.selectedDataTransformType
		);
		return option && option.dataTransformFunction
			? option.dataTransformFunction
			: (/** @type {{datapoint: TimeSeriesData}} */ { datapoint }) => datapoint;
	});
	isDataTransformTypeProportion = $derived(this.selectedDataTransformType === 'proportion');

	// Curve options
	curveOptions = Object.freeze([
		{
			label: 'Smooth',
			value: 'smooth',
			curveFunction: curveMonotoneX
		},
		{
			label: 'Straight',
			value: 'straight',
			curveFunction: curveLinear
		},
		{
			label: 'Step',
			value: 'step',
			curveFunction: curveStep
		}
	]);
	/** @type {CurveType} */
	selectedCurveType = $state(DEFAULT_CURVE_TYPE);
	curveFunction = $derived.by(() => {
		const option = this.curveOptions.find((d) => d.value === this.selectedCurveType);
		return option ? option.curveFunction : null;
	});

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

	/** @param {{ dataTransformType?: DataTransformType, curveType?: CurveType, chartType?: ChartType }} params */
	constructor({
		dataTransformType = DEFAULT_DATA_TRANSFORM_TYPE,
		curveType = DEFAULT_CURVE_TYPE,
		chartType = DEFAULT_CHART_TYPE
	} = {}) {
		this.selectedDataTransformType = dataTransformType;
		this.selectedCurveType = curveType;
		this.selectedChartType = chartType;
	}
}
