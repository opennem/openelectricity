<script>
	import { formatValue } from '$lib/utils/formatters';

	/**
	 * @typedef {Object} Props
	 * @property {any} [fuelData] - Original fuel tech data with years, data, etc.
	 * @property {string} [_fuelTechName] - Name of the fuel technology
	 * @property {any} [processedData] - Processed chart data (seriesData, seriesNames, etc.)
	 * @property {string} [title] - Custom title for the table
	 * @property {string} [subtitle] - Custom subtitle for the table
	 * @property {any} [chartContext] - Chart context for value formatting
	 */

	/** @type {Props} */
	let { fuelData, _fuelTechName, processedData, title, subtitle, chartContext } = $props();

	// Month names for table headers
	const monthNames = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	// Transform data for table display - handles both original fuelData and processedData formats
	let tableData = $derived.by(() => {
		// Handle processed chart data (from combined/cumulative charts)
		if (processedData?.seriesData?.length) {
			return processedData.seriesData.map(
				(/** @type {any} */ monthData, /** @type {number} */ monthIndex) => {
					/** @type {any} */
					const row = {
						month: monthNames[monthIndex] || `Month ${monthIndex + 1}`,
						monthIndex: monthIndex
					};

					processedData.seriesNames.forEach((/** @type {string} */ seriesKey) => {
						row[seriesKey] = monthData[seriesKey];
					});

					return row;
				}
			);
		}

		// Handle original fuelData format (from individual charts)
		if (fuelData?.data?.length && fuelData?.years?.length) {
			return fuelData.data.map((/** @type {any} */ monthData, /** @type {number} */ monthIndex) => {
				/** @type {any} */
				const row = {
					month: monthNames[monthIndex] || `Month ${monthIndex + 1}`,
					monthIndex: monthIndex
				};

				fuelData.years.forEach((/** @type {any} */ year) => {
					row[year.year] = monthData[year.key];
				});

				return row;
			});
		}

		return [];
	});

	// Get sorted years/series for column headers
	let sortedYears = $derived.by(() => {
		// Handle processed chart data
		if (processedData?.seriesNames?.length && processedData?.seriesLabels) {
			return processedData.seriesNames
				.map((/** @type {string} */ key) => ({
					key: key,
					label: processedData.seriesLabels[key] || key,
					year: parseInt(processedData.seriesLabels[key]) || key
				}))
				.sort((/** @type {any} */ a, /** @type {any} */ b) => (a.year || 0) - (b.year || 0));
		}

		// Handle original fuelData format
		if (fuelData?.years?.length) {
			return fuelData.years
				.map((/** @type {any} */ y) => ({
					key: y.year,
					label: y.year,
					year: y.year
				}))
				.sort((/** @type {any} */ a, /** @type {any} */ b) => a.year - b.year);
		}

		return [];
	});

	// Format numbers for display - use chart context formatting if available
	/**
	 * @param {any} value
	 */
	function formatTableValue(value) {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'number') {
			// Use chart context formatting if available (for proper prefix conversion)
			if (chartContext && chartContext.convertAndFormatValue) {
				return chartContext.convertAndFormatValue(value);
			}
			// Fallback to standard formatter
			return formatValue(value);
		}
		return String(value);
	}

	// Get display unit from chart context
	let displayUnit = $derived(chartContext?.chartOptions?.displayUnit || 'MWh');

	// Check if current year
	function isCurrentYear(/** @type {any} */ year) {
		return year === new Date().getFullYear();
	}
</script>

{#if title || subtitle}
	<div class="mb-4">
		{#if title}
			<h4 class="font-medium text-gray-900 mb-1">{title}</h4>
		{/if}
		{#if subtitle}
			<p class="text-sm text-gray-600">{subtitle}</p>
		{/if}
		{#if chartContext}
			<p class="text-sm text-gray-500">Values in {displayUnit}</p>
		{/if}
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
		<thead class="bg-gray-50">
			<tr>
				<th
					scope="col"
					class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200"
				>
					Month
				</th>
				{#each sortedYears as yearObj (yearObj.key)}
					<th
						scope="col"
						class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider"
						class:text-gray-900={isCurrentYear(yearObj.year)}
						class:font-semibold={isCurrentYear(yearObj.year)}
						class:text-gray-500={!isCurrentYear(yearObj.year)}
					>
						{yearObj.label}
						{#if isCurrentYear(yearObj.year)}
							<span class="text-xs font-normal">(current)</span>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each tableData as row (row.monthIndex)}
				<tr class="hover:bg-gray-50">
					<td
						class="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-200"
					>
						{row.month}
					</td>
					{#each sortedYears as yearObj (yearObj.key)}
						<td
							class="px-4 py-3 text-sm text-center"
							class:text-gray-900={isCurrentYear(yearObj.year)}
							class:font-medium={isCurrentYear(yearObj.year)}
							class:text-gray-600={!isCurrentYear(yearObj.year)}
						>
							{formatTableValue(row[yearObj.key])}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if tableData.length === 0}
		<div class="text-center py-8 text-gray-500">
			<p>No data available for table view</p>
		</div>
	{/if}
</div>

<style>
	/* Ensure sticky positioning works correctly */
	.sticky {
		position: sticky;
		z-index: 10;
	}
</style>
