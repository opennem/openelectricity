import { convert } from '$lib/utils/si-units';
import { getNumberFormat, getFormattedDate, getFormattedTime } from '$lib/utils/formatters';
import ChartOptions from './chart-options.svelte.js';
import ChartStyles from './chart-styles.svelte.js';
import ChartTooltips from './chart-tooltips.svelte.js';
import { transformToProportion } from '$lib/utils/data-transform/index.js';

/**
 * @typedef {Object} chartCxtOptions
 * @property {symbol} key
 * @property {string} [title]
 * @property {SiPrefix} [prefix]
 * @property {SiPrefix} [displayPrefix]
 * @property {SiPrefix[]} [allowedPrefixes]
 * @property {string} [baseUnit]
 * @property {Object} [chartStyles]
 * @property {string} [chartStyles.chartHeightClasses]
 */

export default class ChartStore {
	key;
	chartOptions = $state();
	chartStyles = $state();
	chartTooltips = $state();

	/** @type {string} */
	title = $state('');

	/** @type {string} */
	timeZone = $state('+10:00');

	/** @type {TimeSeriesData[]} */
	seriesData = $state.raw([]);

	/** @type {string[]} */
	seriesNames = $state([]);

	/** @type {string[]} */
	hiddenSeriesNames = $state([]);

	/** @type {string[]} */
	visibleSeriesNames = $derived(
		this.seriesNames.filter((name) => !this.hiddenSeriesNames.includes(name))
	);

	/** @type {Object.<string, string>} */
	seriesColours = $state({});

	/** @type {string[]} */
	visibleSeriesColours = $derived(this.visibleSeriesNames.map((name) => this.seriesColours[name]));

	/** @type {Object.<string, string>} */
	seriesLabels = $state({});

	/** @type {string} */
	xKey = $state('date');

	/** @type {Function} */
	x = $derived((/** @type {*} */ d) => d[this.xKey] || d.data[this.xKey]);

	/** @type {*} */
	yKey = $state([]);

	/** @type {string} */
	y = $derived(this.chartOptions.isChartTypeArea ? this.yKey : 'value');

	/** @type {string} */
	zKey = $state('key');

	/** @type {string} */
	z = $derived(this.chartOptions.isChartTypeArea ? this.zKey : 'group');

	/** @type {*} */
	xDomain = $state();

	/** @type {*} */
	customYDomain = $state();
	yDomain = $derived.by(() => {
		if (this.customYDomain) {
			return this.customYDomain;
		}

		if (this.chartOptions.isDataTransformTypeProportion && !this.chartOptions.isChartTypeLine) {
			return [0, 100];
		}
		const addTenPercent = (/** @type {number} */ val) => val + val * 0.1;
		const maxY = this.seriesScaledDataWithMinMax.map((d) => d._max);
		// @ts-ignore
		const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;

		const minY = this.seriesScaledDataWithMinMax.map((d) => d._min);
		// @ts-ignore
		const datasetMin = minY ? addTenPercent(Math.min(...minY)) : 0;
		return [Math.floor(datasetMin), Math.ceil(datasetMax)];
	});

	/** @type {*} */
	xTicks = $state();

	/** @type {*} */
	yTicks = $state();

	/** @type {Function} */
	formatTickX = $state((/** @type {*} */ d) => (d.getTime() === 0 ? '' : d)); // this is used for formatting the x-axis ticks

	/** @type {Function} */
	formatTickXWithTimeZone = $derived((/** @type {*} */ d) => this.formatTickX(d, this.timeZone));

	/** @type {Function} */
	formatX = $state((/** @type {*} */ d) => d);

	/** @type {Function} */
	formatXWithTimeZone = $derived((/** @type {*} */ d) => this.formatX(d, this.timeZone));

	/** @type {boolean} */
	useFormatY = $state(false);

	/** @type {Function} */
	formatY = $state((/** @type {*} */ d) => d);

	/** @type {number} */
	maximumFractionDigits = $state(0);

	/** @type {Function} */
	convertValue = $derived((/** @type {number} */ d) => {
		const formatter = getNumberFormat(0, false);
		const converted = convert(this.chartOptions.prefix, this.chartOptions.displayPrefix, d);
		return isNaN(converted) ? '—' : formatter.format(converted);
	});

	/** @type {Function} */
	convertAndFormatValue = $derived((/** @type {number} */ d) => {
		const converted = convert(this.chartOptions.prefix, this.chartOptions.displayPrefix, d);
		return isNaN(converted) ? '—' : getNumberFormat(this.maximumFractionDigits).format(converted);
	});

	seriesScaledData = $derived.by(() => {
		if (!this.seriesData) return [];

		let isChangeSince = this.chartOptions.selectedDataTransformType === 'changeSince';
		let filteredSeriesData =
			isChangeSince && this.xDomain && this.xDomain[0] && this.xDomain[1]
				? this.seriesData.filter((d) => d.time >= this.xDomain[0] && d.time <= this.xDomain[1])
				: this.seriesData;

		return [...this.seriesData].map((d) =>
			this.chartOptions.dataTransformFunction({
				datapoint: d,
				dataset: filteredSeriesData,
				domains: this.visibleSeriesNames
			})
		);
	});

	seriesProportionData = $derived.by(() => {
		if (!this.seriesData) return [];
		return [...this.seriesData].map((d) =>
			transformToProportion({ datapoint: d, domains: this.seriesNames })
		);
	});

	seriesScaledDataWithMinMax = $derived(
		$state.snapshot(this.seriesScaledData).map((d) => {
			const newObj = { ...d };
			newObj._max = 0;
			newObj._min = 0;
			this.visibleSeriesNames.forEach((name) => {
				const value = d[name];
				if (this.chartOptions.isChartTypeArea) {
					if (newObj._max || newObj._max === 0) newObj._max += +value;
				} else {
					if (newObj._max || newObj._max === 0) newObj._max = Math.max(newObj._max, +value);
				}

				if (this.chartOptions.isChartTypeArea || this.chartOptions.isChartTypeLine) {
					if ((newObj._min || newObj._min === 0) && value < 0) newObj._min += +value;
				} else {
					if (newObj._min || newObj._min === 0) newObj._min = Math.min(newObj._min, +value);
				}
			});
			return newObj;
		})
	);

	/** @type {string | undefined} */
	highlightName = $state();

	/** @type {string | undefined} */
	hoverKey = $state();

	/** @type {number | undefined} */
	hoverTime = $state();

	hoverData = $derived(
		this.hoverTime ? this.seriesData.find((d) => d.time === this.hoverTime) : undefined
	);

	hoverScaledData = $derived(
		this.hoverTime ? this.seriesScaledData.find((d) => d.time === this.hoverTime) : undefined
	);

	hoverProportionData = $derived(
		this.hoverTime ? this.seriesProportionData.find((d) => d.time === this.hoverTime) : undefined
	);

	/** @type {number | undefined} */
	focusTime = $state();

	focusData = $derived(
		this.focusTime ? this.seriesData.find((d) => d.time === this.focusTime) : undefined
	);

	focusScaledData = $derived(
		this.focusTime ? this.seriesScaledData.find((d) => d.time === this.focusTime) : undefined
	);

	focusProportionData = $derived(
		this.focusTime ? this.seriesProportionData.find((d) => d.time === this.focusTime) : undefined
	);

	seriesCsvData = $derived.by(() => {
		if (!this.seriesData) return '';

		let csv = '';
		csv += ['date', ...this.seriesNames.map((d) => this.seriesLabels[d])].join(',') + '\n';

		this.seriesData.forEach((d) => {
			const day = getFormattedDate(d.date, undefined, 'numeric', 'short', 'numeric', this.timeZone);
			const time = getFormattedTime(d.date, this.timeZone);
			const date = day + ' ' + time;
			const row = [date];
			this.seriesNames.forEach((key) => {
				row.push(this.convertValue(d[key]));
			});
			csv += row.join(',') + '\n';
		});
	});

	/** @type {Date[][]} */
	shadingData = $state([]);

	/** @type {string} */
	shadingFill = $state('#33333311');

	/**
	 * @param {chartCxtOptions} options
	 */
	constructor({ key, title, prefix, displayPrefix, allowedPrefixes, baseUnit, chartStyles }) {
		this.key = key;
		this.chartOptions = new ChartOptions({
			prefix,
			displayPrefix,
			allowedPrefixes,
			baseUnit
		});
		this.chartStyles = new ChartStyles();
		this.chartTooltips = new ChartTooltips();
		this.title = title ?? '';

		if (chartStyles) {
			this.chartStyles.chartHeightClasses = chartStyles.chartHeightClasses;
		}
	}

	getNextPrefix() {
		if (!this.chartOptions.allowedPrefixes) return '';

		let index = this.chartOptions.allowedPrefixes.indexOf(this.chartOptions.displayPrefix);
		return index === this.chartOptions.allowedPrefixes.length - 1
			? this.chartOptions.allowedPrefixes[0]
			: this.chartOptions.allowedPrefixes[index + 1];
	}

	formatValue(/** @type {number} */ d) {
		return getNumberFormat(this.maximumFractionDigits).format(d);
	}

	/**
	 * @param {string} name
	 * @param {boolean} [isMetaPressed]
	 */
	updateHiddenSeriesNames(name, isMetaPressed = false) {
		if (isMetaPressed) {
			this.hiddenSeriesNames = this.seriesNames.filter((n) => n !== name);
		} else {
			if (this.hiddenSeriesNames.includes(name)) {
				this.hiddenSeriesNames = this.hiddenSeriesNames.filter((n) => n !== name);
			} else {
				// if everything is going to be hidden, then show all instead
				if (this.hiddenSeriesNames.length === this.seriesNames.length - 1) {
					this.hiddenSeriesNames = [];
				} else {
					this.hiddenSeriesNames = [...this.hiddenSeriesNames, name];
				}
			}
		}
	}
}
