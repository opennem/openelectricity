import { differenceInMonths, parse } from 'date-fns';
import useDate from '$lib/utils/TimeSeries/use-date';

/**
 * Parse and update the data to match the start and last dates of the dataset.
 * @param {StatsData[]} jsonData
 * @returns {StatsData[]}
 */
function parser(jsonData) {
	const data = jsonData || [];
	const energyData = data.filter(
		(/** @type {StatsData} */ d) => d.fuel_tech && d.data_type === 'energy'
	);

	const parseAndUseDate = (/** @type {string} */ dateStr) =>
		parse(useDate(dateStr), 'yyyy-MM-dd', new Date());

	// match up the history data to same start and last, using coal_black as the reference since it always exists in the dataset
	const coalBlack = energyData.find((d) => d.fuel_tech === 'coal_black');
	const dataStart = coalBlack?.history.start || '1998-12-01';
	const dataLast = coalBlack?.history.last || '2023-12-01';

	// pad out data to match start and last dates
	energyData.forEach((d) => {
		const startDiff = differenceInMonths(
			parseAndUseDate(d.history.start),
			parseAndUseDate(dataStart)
		);
		const lastDiff = differenceInMonths(parseAndUseDate(dataLast), parseAndUseDate(d.history.last));

		if (startDiff > 0) {
			for (let i = 0; i < startDiff; i++) {
				d.history.data.unshift(null);
			}

			d.history.start = dataStart;
		}

		if (lastDiff > 0) {
			// TODO pad out last date
			console.warn('Last dates are different, need to pad data.');
		}
	});

	return energyData;
}

export default parser;
