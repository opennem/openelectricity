/**
 * return stats data object with total generation
 * NOTE: the sum to be used for % calculations do not include any loads - only generation
 * @param {StatsData[]} data
 * @param {StatsType} statsType
 * @param {FuelTechCode[]} loads
 * @param {string} id
 * @returns {StatsData}
 */
export default function (data, statsType, loads, id = 'au.total-minus-loads.history') {
	/**
	 * Default values
	 * TODO: update the defaults match the data
	 * @type {StatsData}
	 */
	const totalStats = {
		data_type: 'energy',
		id,
		network: 'nem',
		type: 'energy',
		units: 'GWh',
		history: {
			data: [],
			interval: '1M',
			start: '',
			last: ''
		}
	};

	data.forEach((series, i) => {
		if (i === 0) {
			// create a new array of stats data
			totalStats[statsType].data = series[statsType].data.map(() => 0);
			totalStats[statsType].start = series[statsType].start;
			totalStats[statsType].last = series[statsType].last;
		}

		const ft = series.fuel_tech;

		// NOTE: the sum to be used for % calculations do not include any loads - only generation
		series[statsType].data.forEach((d, i) => {
			const value = totalStats[statsType].data[i];

			if (ft && loads.includes(ft)) {
				// totalStats[statsType].data[i] -= d || 0;
			} else {
				totalStats[statsType].data[i] = Number(value) + Number(d || 0);
			}
		});
	});

	return totalStats;
}
