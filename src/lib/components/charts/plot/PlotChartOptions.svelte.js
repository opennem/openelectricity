/**
 * Reusable chart options state for Observable Plot charts.
 *
 * Encapsulates per-instance configuration (chart type, curve, margins)
 * as reactive Svelte 5 state, following the ChartStyles.svelte.js pattern.
 *
 * @typedef {'monotone-x' | 'linear' | 'step-after'} PlotCurveType
 * @typedef {'stacked-area' | 'line'} PlotChartType
 */

/**
 * @typedef {Object} PlotChartOptionsConfig
 * @property {PlotCurveType} [curve]
 * @property {PlotChartType} [chartType]
 * @property {number} [marginLeft]
 * @property {number} [marginRight]
 */

export default class PlotChartOptions {
	/** @type {{ label: string, value: string | number | null | undefined }[]} */
	static curveOptions = [
		{ label: 'Smooth', value: 'monotone-x' },
		{ label: 'Straight', value: 'linear' },
		{ label: 'Step', value: 'step-after' }
	];

	/** @type {{ label: string, value: string | number | null | undefined }[]} */
	static chartTypeOptions = [
		{ label: 'Stacked Area', value: 'stacked-area' },
		{ label: 'Line', value: 'line' }
	];

	/** @type {{ label: string, value: string | number | null | undefined }} */
	selectedCurve = $state(PlotChartOptions.curveOptions[1]);

	/** @type {{ label: string, value: string | number | null | undefined }} */
	selectedChartType = $state(PlotChartOptions.chartTypeOptions[0]);

	/** @type {number} */
	marginLeft = $state(50);

	/** @type {number} */
	marginRight = $state(20);

	curve = $derived(/** @type {string} */ (this.selectedCurve.value));
	isLine = $derived(this.selectedChartType.value === 'line');
	isStackedArea = $derived(this.selectedChartType.value === 'stacked-area');

	/**
	 * @param {PlotChartOptionsConfig} [config]
	 */
	constructor(config = {}) {
		if (config.curve) {
			const found = PlotChartOptions.curveOptions.find((o) => o.value === config.curve);
			if (found) this.selectedCurve = found;
		}
		if (config.chartType) {
			const found = PlotChartOptions.chartTypeOptions.find((o) => o.value === config.chartType);
			if (found) this.selectedChartType = found;
		}
		if (config.marginLeft !== undefined) this.marginLeft = config.marginLeft;
		if (config.marginRight !== undefined) this.marginRight = config.marginRight;
	}

	/** @param {PlotCurveType} value */
	setCurve(value) {
		const found = PlotChartOptions.curveOptions.find((o) => o.value === value);
		if (found) this.selectedCurve = found;
	}

	/** @param {PlotChartType} value */
	setChartType(value) {
		const found = PlotChartOptions.chartTypeOptions.find((o) => o.value === value);
		if (found) this.selectedChartType = found;
	}
}
