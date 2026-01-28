/**
 * Chart Store v2
 *
 * Main chart state management class using Svelte 5 runes.
 * Manages all chart data, configuration, and interaction state.
 */

import { convert } from '$lib/utils/si-units';
import { getNumberFormat, getFormattedDate, getFormattedTime } from '$lib/utils/formatters';
import { transformToProportion } from '$lib/utils/data-transform';
import ChartOptions from './ChartOptions.svelte.js';
import ChartStyles from './ChartStyles.svelte.js';
import ChartTooltips from './ChartTooltips.svelte.js';

/**
 * @typedef {import('./types.js').ChartType} ChartType
 * @typedef {import('./types.js').DataTransformType} DataTransformType
 */

/**
 * @typedef {Object} ChartConfig
 * @property {symbol} key - Unique identifier for the chart
 * @property {string} [title] - Chart title
 * @property {SiPrefix} [prefix] - SI prefix for data values
 * @property {SiPrefix} [displayPrefix] - SI prefix for display
 * @property {SiPrefix[]} [allowedPrefixes] - Allowed prefix options
 * @property {string} [baseUnit] - Base unit (W, Wh, etc.)
 * @property {string} [chartType] - Initial chart type
 * @property {string} [timeZone] - IANA timezone string
 * @property {boolean} [hideDataOptions] - Hide data transform options
 * @property {boolean} [hideChartTypeOptions] - Hide chart type selector
 * @property {Object} [chartStyles] - Style overrides
 */

export default class ChartStore {
	/** @type {symbol} */
	key;

	/** @type {ChartOptions} */
	chartOptions;

	/** @type {ChartStyles} */
	chartStyles;

	/** @type {ChartTooltips} */
	chartTooltips;

	// Basic configuration
	/** @type {string} */
	title = $state('');

	/** @type {boolean} */
	hideDataOptions = $state(false);

	/** @type {boolean} */
	hideChartTypeOptions = $state(false);

	/** @type {string} */
	timeZone = $state('Australia/Sydney');

	// Series data
	/** @type {TimeSeriesData[]} */
	seriesData = $state.raw([]);

	/** @type {string[]} */
	seriesNames = $state([]);

	/** @type {string[]} */
	hiddenSeriesNames = $state([]);

	visibleSeriesNames = $derived(
		this.seriesNames.filter((name) => !this.hiddenSeriesNames.includes(name))
	);

	/** @type {Record<string, string>} */
	seriesColours = $state({});

	visibleSeriesColours = $derived(this.visibleSeriesNames.map((name) => this.seriesColours[name]));

	/** @type {Record<string, string>} */
	seriesLabels = $state({});

	// Accessor keys
	/** @type {string} */
	xKey = $state('date');

	/** @type {string | string[]} */
	yKey = $state([]);

	/** @type {string} */
	zKey = $state('key');

	// Accessor functions
	x = $derived((/** @type {any} */ d) => d[this.xKey] || d.data?.[this.xKey]);

	y = $derived.by(() => {
		if (!this.chartOptions) return this.yKey;
		return this.chartOptions.isChartTypeArea ? this.yKey : 'value';
	});

	z = $derived.by(() => {
		if (!this.chartOptions) return this.zKey;
		return this.chartOptions.isChartTypeArea ? this.zKey : 'group';
	});

	// Domain configuration
	/** @type {[number, number] | undefined} */
	xDomain = $state();

	/** @type {[number, number] | undefined} */
	#customYDomain = $state();

	yDomain = $derived.by(() => {
		if (this.#customYDomain) return this.#customYDomain;

		if (this.chartOptions?.isDataTransformTypeProportion && !this.chartOptions?.isChartTypeLine) {
			return /** @type {[number, number]} */ ([0, 100]);
		}

		const maxValues = this.seriesScaledDataWithMinMax.map((d) => d._max ?? 0);
		const minValues = this.seriesScaledDataWithMinMax.map((d) => d._min ?? 0);

		const datasetMax = maxValues.length ? Math.max(...maxValues) : 0;
		const datasetMin = minValues.length ? Math.min(...minValues) : 0;

		// Add 10% padding
		const paddedMax = datasetMax + datasetMax * 0.1;
		const paddedMin = datasetMin < 0 ? datasetMin + datasetMin * 0.1 : datasetMin;

		return /** @type {[number, number]} */ ([Math.floor(paddedMin), Math.ceil(paddedMax)]);
	});

	/**
	 * Set a custom Y domain
	 * @param {[number, number] | undefined} domain
	 */
	setYDomain(domain) {
		this.#customYDomain = domain;
	}

	// Ticks
	/** @type {Date[] | number[] | number | undefined} */
	xTicks = $state();

	/** @type {Date[] | undefined} */
	xGridlineTicks = $state();

	/** @type {number[] | number | undefined} */
	yTicks = $state();

	// Formatters
	/** @type {number} */
	maximumFractionDigits = $state(0);

	/** @type {(value: any, timeZone?: string) => string} */
	formatTickX = $state((/** @type {any} */ d) => (d?.getTime?.() === 0 ? '' : d));

	formatTickXWithTimeZone = $derived((/** @type {any} */ d) => this.formatTickX(d, this.timeZone));

	/** @type {(value: any, timeZone?: string) => string} */
	formatX = $state((/** @type {any} */ d) => d);

	formatXWithTimeZone = $derived((/** @type {any} */ d) => this.formatX(d, this.timeZone));

	/** @type {boolean} */
	useFormatY = $state(false);

	/** @type {(value: number) => string} */
	formatY = $state((/** @type {number} */ d) => String(d));

	// Value conversion
	convertValue = $derived((/** @type {number} */ value) => {
		if (!this.chartOptions) return String(value);
		const converted = convert(this.chartOptions.prefix, this.chartOptions.displayPrefix, value);
		if (isNaN(converted)) return '—';
		const formatter = getNumberFormat(0, false);
		return formatter.format(converted);
	});

	convertAndFormatValue = $derived((/** @type {number} */ value) => {
		if (!this.chartOptions) return String(value);
		const converted = convert(this.chartOptions.prefix, this.chartOptions.displayPrefix, value);
		if (isNaN(converted)) return '—';
		return getNumberFormat(this.maximumFractionDigits).format(converted);
	});

	// Transformed data
	seriesScaledData = $derived.by(() => {
		if (!this.seriesData?.length || !this.chartOptions) return [];

		const isChangeSince = this.chartOptions.selectedDataTransformType === 'changeSince';
		const xDomain = this.xDomain;
		const filteredData =
			isChangeSince && xDomain?.[0] !== undefined && xDomain?.[1] !== undefined
				? this.seriesData.filter((d) => d.time >= xDomain[0] && d.time <= xDomain[1])
				: this.seriesData;

		return this.seriesData.map((d) =>
			this.chartOptions.dataTransformFunction({
				datapoint: d,
				dataset: filteredData,
				domains: this.visibleSeriesNames
			})
		);
	});

	seriesProportionData = $derived.by(() => {
		if (!this.seriesData?.length) return [];
		return this.seriesData.map((d) =>
			transformToProportion({ datapoint: d, domains: this.seriesNames })
		);
	});

	seriesScaledDataWithMinMax = $derived.by(() => {
		return this.seriesScaledData.map((d) => {
			const result = { ...d, _max: 0, _min: 0 };

			for (const name of this.visibleSeriesNames) {
				const value = Number(d[name]) || 0;

				if (this.chartOptions?.isChartTypeArea) {
					result._max += value;
				} else {
					result._max = Math.max(result._max, value);
				}

				if (value < 0) {
					result._min += value;
				}
			}

			return result;
		});
	});

	// Highlight state
	/** @type {string | undefined} */
	highlightName = $state();

	// Hover state
	/** @type {string | undefined} */
	hoverKey = $state();

	/** @type {number | undefined} */
	hoverTime = $state();

	hoverData = $derived.by(() => {
		if (this.isCategoryChart && this.hoverCategory !== undefined) {
			return this.seriesData.find((d) => d[this.xKey] === this.hoverCategory);
		}
		return this.hoverTime ? this.seriesData.find((d) => d.time === this.hoverTime) : undefined;
	});

	hoverScaledData = $derived.by(() => {
		if (this.isCategoryChart && this.hoverCategory !== undefined) {
			return this.seriesScaledData.find((d) => d[this.xKey] === this.hoverCategory);
		}
		return this.hoverTime
			? this.seriesScaledData.find((d) => d.time === this.hoverTime)
			: undefined;
	});

	hoverProportionData = $derived.by(() => {
		if (this.isCategoryChart && this.hoverCategory !== undefined) {
			return this.seriesProportionData.find((d) => d[this.xKey] === this.hoverCategory);
		}
		return this.hoverTime
			? this.seriesProportionData.find((d) => d.time === this.hoverTime)
			: undefined;
	});

	// Focus state (click/lock)
	/** @type {number | undefined} */
	focusTime = $state();

	focusData = $derived.by(() => {
		if (this.isCategoryChart && this.focusCategory !== undefined) {
			return this.seriesData.find((d) => d[this.xKey] === this.focusCategory);
		}
		return this.focusTime ? this.seriesData.find((d) => d.time === this.focusTime) : undefined;
	});

	focusScaledData = $derived.by(() => {
		if (this.isCategoryChart && this.focusCategory !== undefined) {
			return this.seriesScaledData.find((d) => d[this.xKey] === this.focusCategory);
		}
		return this.focusTime
			? this.seriesScaledData.find((d) => d.time === this.focusTime)
			: undefined;
	});

	focusProportionData = $derived.by(() => {
		if (this.isCategoryChart && this.focusCategory !== undefined) {
			return this.seriesProportionData.find((d) => d[this.xKey] === this.focusCategory);
		}
		return this.focusTime
			? this.seriesProportionData.find((d) => d.time === this.focusTime)
			: undefined;
	});

	// CSV export
	seriesCsvData = $derived.by(() => {
		if (!this.seriesData?.length) return '';

		const headers = ['date', ...this.seriesNames.map((n) => this.seriesLabels[n] || n)];
		const rows = [headers.map((h) => `"${h}"`).join(',')];

		for (const d of this.seriesData) {
			const day = getFormattedDate(d.date, undefined, 'numeric', 'short', 'numeric', this.timeZone);
			const time = getFormattedTime(d.date, this.timeZone);
			const dateStr = `${day} ${time}`;

			const values = this.seriesNames.map((name) => this.convertValue(Number(d[name])));
			const row = [`"${dateStr}"`, ...values.map((v) => `"${v}"`)];
			rows.push(row.join(','));
		}

		return rows.join('\n');
	});

	// Shading/overlay data
	/** @type {Date[][]} */
	shadingData = $state([]);

	/** @type {string} */
	shadingFill = $state('#33333311');

	// Stacking options
	/** @type {boolean} */
	useDivergingStack = $state(false);

	// Category chart mode
	/** @type {boolean} */
	isCategoryChart = $state(false);

	/** @type {string | number | undefined} */
	hoverCategory = $state();

	/** @type {string | number | undefined} */
	focusCategory = $state();

	// Reference lines (horizontal annotations)
	/**
	 * @type {Array<{value: number, label?: string, colour?: string}>}
	 */
	yReferenceLines = $state([]);

	/**
	 * @param {ChartConfig} config
	 */
	constructor(config) {
		const {
			key,
			title = '',
			prefix = '',
			displayPrefix,
			allowedPrefixes = [],
			baseUnit = '',
			chartType = 'area',
			timeZone = 'Australia/Sydney',
			hideDataOptions = false,
			hideChartTypeOptions = false,
			chartStyles
		} = config;

		this.key = key;
		this.title = title;
		this.timeZone = timeZone;
		this.hideDataOptions = hideDataOptions;
		this.hideChartTypeOptions = hideChartTypeOptions;

		this.chartOptions = new ChartOptions({
			prefix,
			displayPrefix: displayPrefix ?? prefix,
			allowedPrefixes,
			baseUnit,
			chartType: /** @type {import('./ChartOptions.svelte.js').ChartType} */ (chartType)
		});

		this.chartStyles = new ChartStyles(chartStyles);
		this.chartTooltips = new ChartTooltips();
	}

	/**
	 * Get the next prefix in the cycle
	 * @returns {SiPrefix}
	 */
	getNextPrefix() {
		if (!this.chartOptions?.allowedPrefixes?.length) return '';

		const currentIndex = this.chartOptions.allowedPrefixes.indexOf(this.chartOptions.displayPrefix);
		const nextIndex = (currentIndex + 1) % this.chartOptions.allowedPrefixes.length;
		return this.chartOptions.allowedPrefixes[nextIndex];
	}

	/**
	 * Format a numeric value
	 * @param {number} value
	 * @returns {string}
	 */
	formatValue(value) {
		return getNumberFormat(this.maximumFractionDigits).format(value);
	}

	/**
	 * Toggle visibility of a series
	 * @param {string} name - Series name to toggle
	 * @param {boolean} [isMetaPressed] - If true, show only this series
	 */
	toggleSeriesVisibility(name, isMetaPressed = false) {
		if (isMetaPressed) {
			// Show only this series
			this.hiddenSeriesNames = this.seriesNames.filter((n) => n !== name);
			return;
		}

		if (this.hiddenSeriesNames.includes(name)) {
			// Show the series
			this.hiddenSeriesNames = this.hiddenSeriesNames.filter((n) => n !== name);
		} else {
			// Hide the series, but prevent hiding all
			if (this.hiddenSeriesNames.length === this.seriesNames.length - 1) {
				// Would hide all - show all instead
				this.hiddenSeriesNames = [];
			} else {
				this.hiddenSeriesNames = [...this.hiddenSeriesNames, name];
			}
		}
	}

	/**
	 * Set hover state
	 * @param {number | undefined} time
	 * @param {string} [key]
	 */
	setHover(time, key) {
		this.hoverTime = time;
		if (key !== undefined) this.hoverKey = key;
	}

	/**
	 * Set hover state for category chart
	 * @param {string | number | undefined} category
	 * @param {string} [key]
	 */
	setHoverCategory(category, key) {
		this.hoverCategory = category;
		this.hoverKey = key;
	}

	/**
	 * Clear hover state
	 */
	clearHover() {
		this.hoverTime = undefined;
		this.hoverCategory = undefined;
		this.hoverKey = undefined;
	}

	/**
	 * Toggle focus on a time point
	 * @param {number} time
	 */
	toggleFocus(time) {
		this.focusTime = this.focusTime === time ? undefined : time;
	}

	/**
	 * Toggle focus on a category
	 * @param {string | number} category
	 */
	toggleFocusCategory(category) {
		this.focusCategory = this.focusCategory === category ? undefined : category;
	}

	/**
	 * Clear focus state
	 */
	clearFocus() {
		this.focusTime = undefined;
		this.focusCategory = undefined;
	}

	/**
	 * Reset all interaction state
	 */
	resetInteractions() {
		this.clearHover();
		this.clearFocus();
		this.highlightName = undefined;
	}
}
