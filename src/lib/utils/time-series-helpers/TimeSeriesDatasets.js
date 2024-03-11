import { rollup } from 'd3-array';
import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';
import transform from '$lib/utils/time-series-helpers/transform-stats-to-ts';
import { key } from '$lib/utils/time-series-helpers/rollup/key';
import meanReducer from '$lib/utils/time-series-helpers/reducer/mean';
import withMinMax from '$lib/utils/time-series-helpers/with-min-max';
import transformRollingSum12Mth from '$lib/utils/rolling-sum-12-mth';

/**
 *
 * @param {StatsData[]} statsDatasets
 * @param {StatsInterval} statsInterval
 * @param {StatsType} statsType
 * @param {*} labelReducer
 * * @param {*} colourReducer
 */
function TimeSeriesDatasets(statsDatasets, statsInterval, statsType, labelReducer, colourReducer) {
	/** @type {TimeSeriesData[]} */
	this.data = [];

	this.statsDatasets = statsDatasets;
	this.statsInterval = statsInterval;
	this.statsType = statsType || 'history';
	this.seriesNames = statsDatasets.map((d) => d.id);

	this.seriesLabels = statsDatasets.map((d) => (d.fuel_tech ? fuelTechName(d.fuel_tech) : ''));
	this.seriesColours = statsDatasets.map((d) =>
		d.fuel_tech ? fuelTechColour(d.fuel_tech) : '#fff'
	);

	if (labelReducer) {
		this.seriesLabels2 = statsDatasets.reduce(labelReducer, {});
	}
	if (colourReducer) {
		this.seriesColours2 = statsDatasets.reduce(colourReducer, {});
	}
}

TimeSeriesDatasets.prototype.transform = function () {
	this.data = transform(this.statsDatasets, this.statsInterval, this.statsType);
	return this;
};

TimeSeriesDatasets.prototype.rollup = function (/** @type {StatsInterval} */ targetStatsInterval) {
	const rolledUpData = rollup(
		this.data.map((d) => {
			return {
				...d,
				key: key(d.time, targetStatsInterval.milliseconds)
			};
		}),
		(/** @type {TimeSeriesData[]} */ values) => meanReducer(values, this.seriesNames),
		(/** @type {TimeSeriesData} */ d) => d.key
	);
	this.data = [...rolledUpData.values()];
	return this;
};

TimeSeriesDatasets.prototype.calculate12MthRollingSum = function () {
	this.data = transformRollingSum12Mth(this.data, this.seriesNames);
	return this;
};

TimeSeriesDatasets.prototype.convertToPercentage = function (
	/** @type {string} */ id = 'au.total-minus-loads.history'
) {
	this.data = this.data.map((d) => {
		/** @type {TimeSeriesData} */
		const obj = {
			date: d.date,
			time: d.time
		};

		const total = /** @type {number} */ (d[id]);

		this.seriesNames.forEach((key) => {
			const seriesValue = /** @type {number} */ (d[key]);
			if (seriesValue && total) {
				obj[key] = (seriesValue / total) * 100;
			} else {
				obj[key] = 0;
			}
		});

		return obj;
	});

	return this;
};

TimeSeriesDatasets.prototype.updateMinMax = function (/** @type {string[]} */ loads) {
	this.data = withMinMax(this.data, this.seriesNames, loads);
	return this;
};

export default TimeSeriesDatasets;
