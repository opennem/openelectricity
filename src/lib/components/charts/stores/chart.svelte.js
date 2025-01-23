import { convert } from '$lib/utils/si-units';
import { getNumberFormat, getFormattedDate, getFormattedTime } from '$lib/utils/formatters';
import ChartOptions from './chart-options.svelte.js';
import ChartStyles from './chart-styles.svelte.js';
import { transformToProportion } from '$lib/utils/data-transform/index.js';

export default class ChartState {
	/** @type {string} */
	title = $state('');

	/** @type {SiPrefix[]} */
	allowedPrefixes = $state([]);

	/** @type {boolean} */
	allowPrefixSwitch = $derived(this.allowedPrefixes && this.allowedPrefixes.length > 1);

	/** @type {string} */
	baseUnit = $state('');

	/** @type {string} */
	timeZone = $state('Australia/Sydney');

	/** @type {SiPrefix} */
	prefix = $state('');

	/** @type {SiPrefix} */
	displayPrefix = $state('');

	/** @type {TimeSeriesData[]} */
	seriesData = $state([]);

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

	/** @type {Object.<string, string>} */
	seriesLabels = $state({});

	/** @type {*} */
	xDomain = $state();

	/** @type {*} */
	yDomain = $state();

	/** @type {*} */
	xTicks = $state();

	/** @type {*} */
	yTicks = $state();

	/** @type {Function} */
	formatTickX = $state((/** @type {*} */ d) => d); // this is used for formatting the x-axis ticks

	/** @type {Function} */
	formatX = $state((/** @type {*} */ d) => d);

	/** @type {Function} */
	formatY = $state((/** @type {*} */ d) => d);

	/** @type {number} */
	maximumFractionDigits = $state(0);

	/** @type {Function} */
	convertValue = $derived((/** @type {number} */ d) => {
		const formatter = getNumberFormat(0, false);
		const converted = convert(this.prefix, this.displayPrefix, d);
		return isNaN(converted) ? '—' : formatter.format(converted);
	});

	/** @type {Function} */
	convertAndFormatValue = $derived((/** @type {number} */ d) => {
		const converted = convert(this.prefix, this.displayPrefix, d);
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
				domains: this.seriesNames
			})
		);
	});

	seriesProportionData = $derived.by(() => {
		if (!this.seriesData) return [];
		return [...this.seriesData].map((d) =>
			transformToProportion({ datapoint: d, domains: this.seriesNames })
		);
	});

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

	constructor() {
		this.chartOptions = new ChartOptions();
		this.chartStyles = new ChartStyles();
	}

	getNextPrefix() {
		if (!this.allowedPrefixes) return '';

		let index = this.allowedPrefixes.indexOf(this.displayPrefix);
		return index === this.allowedPrefixes.length - 1
			? this.allowedPrefixes[0]
			: this.allowedPrefixes[index + 1];
	}

	formatValue(/** @type {number} */ d) {
		return getNumberFormat(this.maximumFractionDigits).format(d);
	}

	/**
	 * @param {string} name
	 * @param {boolean} isMetaPressed
	 */
	updateHiddenSeriesNames(name, isMetaPressed) {
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

	reset() {
		this.seriesData = [];
		this.seriesNames = [];
		this.seriesColours = {};
		this.seriesLabels = {};
	}
}
