import { parseISO, addYears, startOfYear } from 'date-fns';

/**
 * @param {{
 * data: MilestoneRecord[],
 * period: string | undefined
 * }} param0
 * @returns {{
 * milestones: MilestoneRecord[],
 * seriesData: TimeSeriesData[],
 * xDomain: [Date, Date]
 * }}
 */
function process({ data, period }) {
	let currentDate = new Date();
	let newPointDate = addYears(currentDate, 1);

	let sorted = data
		.map((record) => {
			const date = record.interval ? parseISO(record.interval) : new Date();

			return {
				...record,
				date,
				time: date.getTime()
			};
		})
		.sort((a, b) => a.time - b.time);

	// Add a new point to the end of the year to the series data to ensure the line chart is complete
	let seriesData = [
		...sorted,
		{
			...sorted[sorted.length - 1],
			date: newPointDate,
			time: newPointDate.getTime()
		}
	].map((record) => {
		return {
			date: record.date,
			time: record.time,
			value: record.value,
			_min: record.value,
			_max: record.value
		};
	});

	return {
		milestones: sorted,
		seriesData,
		xDomain: [startOfYear(seriesData[0].date), currentDate]
	};
}

export default process;
