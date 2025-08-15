/**
 * Transform generation trends data for profiles view
 * Creates data structure for month x-axis with year lines, grouped by fuel tech
 * @param {any} apiData - The API response data
 * @returns {Object} - Object with fuel tech as keys, each containing chart data
 */
export function transformGenerationTrendsProfiles(apiData) {
	if (!apiData?.order?.length || !apiData?.data) {
		return {};
	}

	const { order, data } = apiData;
	const result = {};

	// Process each fuel technology
	order.forEach((fuelTechKey) => {
		const fuelTechData = data[fuelTechKey];
		
		if (!fuelTechData?.results?.[0]?.data?.length) {
			result[fuelTechKey] = { data: [], years: [], months: [] };
			return;
		}

		// Extract and process data points
		const dataPoints = fuelTechData.results[0].data.map((/** @type {any} */ entry) => {
			const dateStr = entry[0].split('T')[0];
			const date = new Date(dateStr);
			const value = entry[1] || 0;
			
			return {
				date,
				year: date.getFullYear(),
				month: date.getMonth(), // 0-based month
				monthName: date.toLocaleString('en', { month: 'short' }),
				value
			};
		});

		// Group by year and month
		const years = [...new Set(dataPoints.map(d => d.year))].sort();
		const months = Array.from({ length: 12 }, (_, i) => ({
			index: i,
			name: new Date(2000, i, 1).toLocaleString('en', { month: 'short' })
		}));

		// Create data structure for multi-line chart: array of objects with month and year values
		const chartData = months.map((month) => {
			/** @type {any} */
			const monthData = { 
				time: month.index, // Use month index as time for chart
				date: new Date(2000, month.index, 1), // Create date for month
				month: month.index + 1, // 1-based for display
				monthName: month.name,
				monthIndex: month.index // Keep 0-based for lookup
			};

			years.forEach((year) => {
				// Find data point for this year/month combination
				const dataPoint = dataPoints.find((/** @type {any} */ d) => 
					d.year === year && d.month === month.index
				);
				monthData[`year_${year}`] = dataPoint ? dataPoint.value : null;
			});

			return monthData;
		});

		// Also create expanded data for multi-line charts
		/** @type {any[]} */
		const expandedData = [];
		years.forEach((year) => {
			months.forEach((month) => {
				const dataPoint = dataPoints.find(d => 
					d.year === year && d.month === month.index
				);
				if (dataPoint) {
					expandedData.push({
						time: month.index,
						date: new Date(2000, month.index, 1),
						month: month.index + 1,
						monthName: month.name,
						year: year,
						yearLabel: year.toString(),
						value: dataPoint.value
					});
				}
			});
		});

		// Generate colors for years (light gray for historical, dark gray for current year)
		const currentYear = new Date().getFullYear();
		const yearColors = years.map((year) => {
			return year === currentYear ? '#374151' : '#9ca3af'; // dark gray for current, light gray for others
		});

		result[fuelTechKey] = {
			data: chartData,
			expandedData: expandedData,
			years: years.map((y, i) => ({ 
				key: `year_${y}`, 
				label: y.toString(), 
				year: y, 
				color: yearColors[i],
				isCurrent: y === currentYear
			})),
			yearKeys: years.map(y => `year_${y}`),
			yearColors: yearColors,
			months,
			totalDataPoints: dataPoints.length
		};
	});

	return result;
}