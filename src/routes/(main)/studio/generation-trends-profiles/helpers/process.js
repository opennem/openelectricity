import { transformGenerationTrendsProfiles } from '$lib/utils/data-transform';
import { fuelTechColourMap } from '$lib/theme/openelectricity';

/**
 * Process generation trends data for chart display
 * @param {any} data - Raw API data
 * @param {string} fuelTech - Fuel technology name
 * @param {string} unit - Unit prefix for conversion
 */
export function processGenerationTrendsData(data, fuelTech, unit = 'M') {
	// Transform the data using existing utility
	const profilesData = transformGenerationTrendsProfiles(data);
	const fuelData = /** @type {any} */ (profilesData)[fuelTech];

	if (!fuelData || !fuelData.data || fuelData.data.length === 0) {
		return null;
	}

	// Convert to LayerCake-compatible format for LineChartWithContext
	// Each year becomes a separate data series
	const seriesData = fuelData.data.map((/** @type {any} */ monthData) => {
		// Use month index (0-11) as the x-axis value for proper month display
		const monthIndex =
			monthData.monthIndex !== undefined ? monthData.monthIndex : monthData.month - 1;
		const date = new Date(2000, monthIndex, 1);
		const point = {
			time: date.getTime(), // Use timestamp for proper hover detection
			date: date, // Create date for month (year doesn't matter for display)
			datetime: date,
			month: monthIndex + 1, // 1-based month for display
			monthName: monthData.monthName || date.toLocaleDateString('en', { month: 'short' })
		};

		// Add each year's data as a separate property
		fuelData.years.forEach(
			(/** @type {{ key: string, label: string, color: string }} */ yearInfo) => {
				/** @type {any} */ (point)[yearInfo.key] = monthData[yearInfo.key] ?? null;
			}
		);

		return point;
	});

	// Create series metadata
	const seriesNames = fuelData.yearKeys || [];
	const seriesColours = {};
	const seriesLabels = {};

	fuelData.years.forEach(
		(/** @type {{ key: string, label: string, color: string }} */ yearInfo) => {
			/** @type {any} */ (seriesColours)[yearInfo.key] = yearInfo.color;
			/** @type {any} */ (seriesLabels)[yearInfo.key] = yearInfo.label;
		}
	);

	return {
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		fuelData // Keep original for table view
	};
}

/**
 * Process combined generation trends data for chart display
 * @param {any} data - Raw API data
 * @param {string[]} enabledFuelTechs - Array of enabled fuel technology names
 */
export function processCombinedGenerationTrendsData(data, enabledFuelTechs) {
	// Transform the data using existing utility
	const profilesData = transformGenerationTrendsProfiles(data);

	if (!profilesData || Object.keys(profilesData).length === 0) {
		return null;
	}

	// Get all available years from the first fuel tech
	const firstFuelTech = Object.keys(profilesData)[0];
	const firstFuelData = /** @type {any} */ (profilesData)[firstFuelTech];

	if (!firstFuelData || !firstFuelData.data || firstFuelData.data.length === 0) {
		return null;
	}

	// Convert to LayerCake-compatible format for LineChartWithContext
	// Sum values across enabled fuel technologies for each month/year combination
	const seriesData = firstFuelData.data.map((/** @type {any} */ monthData) => {
		const monthIndex =
			monthData.monthIndex !== undefined ? monthData.monthIndex : monthData.month - 1;
		const date = new Date(2000, monthIndex, 1);
		const point = {
			time: date.getTime(), // Use timestamp for proper hover detection
			date: date, // Create date for month (year doesn't matter for display)
			datetime: date,
			month: monthIndex + 1, // 1-based month for display
			monthName: monthData.monthName || date.toLocaleDateString('en', { month: 'short' })
		};

		// Add each year's combined data as a separate property
		firstFuelData.years.forEach(
			(/** @type {{ key: string, label: string, color: string }} */ yearInfo) => {
				let totalValue = 0;

				// Sum values from all enabled fuel technologies for this month/year
				enabledFuelTechs.forEach((/** @type {string} */ fuelTech) => {
					const fuelData = /** @type {any} */ (profilesData)[fuelTech];
					if (fuelData && fuelData.data) {
						const monthData = fuelData.data.find(
							(/** @type {any} */ m) => (m.monthIndex !== undefined ? m.monthIndex : m.month - 1) === monthIndex
						);
						if (monthData && monthData[yearInfo.key] != null) {
							totalValue += monthData[yearInfo.key];
						}
					}
				});

				/** @type {any} */ (point)[yearInfo.key] = totalValue > 0 ? totalValue : null;
			}
		);

		return point;
	});

	// Create series metadata (same years, but representing combined data)
	const seriesNames = firstFuelData.yearKeys || [];
	const seriesColours = {};
	const seriesLabels = {};

	firstFuelData.years.forEach(
		(/** @type {{ key: string, label: string, color: string }} */ yearInfo) => {
			/** @type {any} */ (seriesColours)[yearInfo.key] = yearInfo.color;
			/** @type {any} */ (seriesLabels)[yearInfo.key] = yearInfo.label;
		}
	);

	return {
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		enabledFuelTechs // Track which fuel techs are included
	};
}

/**
 * Process cumulative generation trends data for chart display
 * @param {any} data - Raw API data
 * @param {string[]} enabledFuelTechs - Array of enabled fuel technology names
 */
export function processCumulativeGenerationTrendsData(data, enabledFuelTechs) {
	// Transform the data using existing utility
	const profilesData = transformGenerationTrendsProfiles(data);

	if (!profilesData || Object.keys(profilesData).length === 0) {
		return null;
	}

	// Get all available years from the first fuel tech
	const firstFuelTech = Object.keys(profilesData)[0];
	const firstFuelData = /** @type {any} */ (profilesData)[firstFuelTech];

	if (!firstFuelData || !firstFuelData.data || firstFuelData.data.length === 0) {
		return null;
	}

	// Get current date info for future month filtering
	const now = new Date();
	const currentYear = now.getFullYear();
	const lastMonth = now.getMonth() - 1; // Last month (0-based, 0 = January, 11 = December)
	const lastMonthYear = lastMonth < 0 ? currentYear - 1 : currentYear; // Handle year boundary

	// Convert to LayerCake-compatible format for LineChartWithContext
	// Calculate cumulative sum from January to December for each year
	const seriesData = firstFuelData.data.map((/** @type {any} */ monthData, /** @type {number} */ monthIndex) => {
		const date = new Date(2000, monthIndex, 1);
		const point = {
			time: date.getTime(), // Use timestamp for proper hover detection
			date: date, // Create date for month (year doesn't matter for display)
			datetime: date,
			month: monthIndex + 1, // 1-based month for display
			monthName: monthData.monthName || date.toLocaleDateString('en', { month: 'short' })
		};

		// Add each year's cumulative data as a separate property
		firstFuelData.years.forEach(
			(/** @type {{ key: string, label: string, color: string }} */ yearInfo) => {
				const year = parseInt(yearInfo.label) || parseInt(yearInfo.key);

				// Check if this is a future month (for current year, use last completed month)
				const isFutureMonth = year === currentYear && monthIndex > (lastMonth < 0 ? 11 : lastMonth);

				if (isFutureMonth) {
					// Set future months to null
					/** @type {any} */ (point)[yearInfo.key] = null;
				} else {
					let cumulativeValue = 0;
					let hasAnyData = false;

					// Sum values from January up to current month for each enabled fuel tech
					for (let i = 0; i <= monthIndex; i++) {
						enabledFuelTechs.forEach((/** @type {string} */ fuelTech) => {
							const fuelData = /** @type {any} */ (profilesData)[fuelTech];
							if (fuelData && fuelData.data && fuelData.data[i]) {
								const monthDataForFuel = fuelData.data[i];
								if (monthDataForFuel && monthDataForFuel[yearInfo.key] != null) {
									cumulativeValue += monthDataForFuel[yearInfo.key];
									hasAnyData = true;
								}
							}
						});
					}

					// Only set the value if we found actual data, otherwise keep it null
					/** @type {any} */ (point)[yearInfo.key] = hasAnyData ? cumulativeValue : null;
				}
			}
		);

		return point;
	});

	// Create series metadata (same years, but representing cumulative data)
	const seriesNames = firstFuelData.yearKeys || [];
	const seriesColours = {};
	const seriesLabels = {};

	firstFuelData.years.forEach(
		(/** @type {{ key: string, label: string, color: string }} */ yearInfo) => {
			/** @type {any} */ (seriesColours)[yearInfo.key] = yearInfo.color;
			/** @type {any} */ (seriesLabels)[yearInfo.key] = yearInfo.label;
		}
	);

	return {
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		enabledFuelTechs // Track which fuel techs are included
	};
}
