import { rollup } from 'd3-array';
import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';
import transform from '$lib/utils/time-series-helpers/transform-stats-to-ts';
import { key } from '$lib/utils/time-series-helpers/rollup/key';
import meanReducer from '$lib/utils/time-series-helpers/reducer/mean';
import withMinMax from '$lib/utils/time-series-helpers/with-min-max';

/**
 *
 * @param {StatsData[]} statsDatasets
 * @param {StatsInterval} statsInterval
 * @param {StatsType} statsType
 */
function TimeSeriesDatasets(statsDatasets, statsInterval, statsType) {
	/** @type {TimeSeriesData[]} */
	this.data = [];
	/** @type {string[]} */
	this.seriesNames = [];

	this.statsDatasets = statsDatasets;
	this.statsInterval = statsInterval;
	this.statsType = statsType || 'history';

	this.seriesColours = statsDatasets.map((d) => fuelTechColour(d.fuel_tech));
	this.seriesLabels = statsDatasets.map((d) => fuelTechName(d.fuel_tech));
}

TimeSeriesDatasets.prototype.transform = function () {
	this.data = transform(this.statsDatasets, this.statsInterval, this.statsType);
	this.seriesNames =
		this.data && this.data.length
			? Object.keys(this.data[0]).filter((d) => d !== 'date' && d !== 'time')
			: [];
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

TimeSeriesDatasets.prototype.updateMinMax = function (/** @type {string[]} */ loads) {
	this.data = withMinMax(this.data, this.seriesNames, loads);
	return this;
};

export default TimeSeriesDatasets;
