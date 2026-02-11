<script>
	/**
	 * FacilityDataTable - Scrollable data table showing visible power chart data
	 *
	 * Displays time-series power data in a compact table with one row per timestamp
	 * and one column per series (unit). Values are already in MW.
	 */

	/**
	 * @typedef {Object} Props
	 * @property {Array<Record<string, any>>} data - Array of row objects from getDataForRange(), each with { date, time, ...seriesValues }
	 * @property {string[]} seriesNames - Array of series keys (e.g. ['power_UNIT1', 'power_UNIT2'])
	 * @property {Record<string, string>} seriesLabels - Mapping of series keys to display labels
	 * @property {string} timeZone - Timezone offset string like '+10:00' or '+08:00'
	 */

	/** @type {Props} */
	let { data, seriesNames, seriesLabels, timeZone } = $props();

	/**
	 * Map offset string to IANA timezone for Intl.DateTimeFormat
	 * Uses DST-free zones: Brisbane (AEST +10), Perth (AWST +8)
	 */
	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	/** Time formatter for HH:mm display in the facility's timezone */
	let timeFormatter = $derived(
		new Intl.DateTimeFormat('en-AU', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: ianaTimeZone
		})
	);

	/** Date formatter for detecting day boundaries */
	let dateFormatter = $derived(
		new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: ianaTimeZone
		})
	);

	/** Number formatter for MW values with 1 decimal place */
	const valueFormatter = new Intl.NumberFormat('en-AU', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	/** Rows sorted newest first */
	let sortedRows = $derived([...data].reverse());

	/**
	 * Format a timestamp to HH:mm in the facility's timezone
	 * @param {number} timeMs - Timestamp in milliseconds
	 * @returns {string}
	 */
	function formatTime(timeMs) {
		try {
			return timeFormatter.format(new Date(timeMs));
		} catch {
			return '—';
		}
	}

	/**
	 * Format a timestamp to a short date string for day boundary markers
	 * @param {number} timeMs - Timestamp in milliseconds
	 * @returns {string}
	 */
	function formatDate(timeMs) {
		try {
			return dateFormatter.format(new Date(timeMs));
		} catch {
			return '';
		}
	}

	/**
	 * Format MW value with 1 decimal place
	 * @param {any} value - Power value in MW
	 * @returns {string}
	 */
	function formatValue(value) {
		if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
			return '—';
		}
		return valueFormatter.format(value);
	}

	/**
	 * Get display label for a series key
	 * @param {string} key
	 * @returns {string}
	 */
	function getLabel(key) {
		return seriesLabels[key] || key;
	}

	/**
	 * Determine if a row represents a day boundary (different day from the next row in time order).
	 * Since rows are sorted newest first, we compare with the next row (which is older).
	 * @param {number} index - Index in sortedRows
	 * @returns {string | null} - Date string if this is the first row of a new day, null otherwise
	 */
	function getDayLabel(index) {
		const row = sortedRows[index];
		if (!row?.time) return null;

		const currentDate = formatDate(row.time);

		if (index === 0) return currentDate;

		const prevRow = sortedRows[index - 1];
		if (!prevRow?.time) return currentDate;

		const prevDate = formatDate(prevRow.time);
		return currentDate !== prevDate ? currentDate : null;
	}
</script>

<div>
	<table class="w-full text-xs border-collapse">
		<thead class="sticky top-0 z-10 bg-white">
			<tr class="border-b border-mid-warm-grey">
				<th class="text-left font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
					Time
				</th>
				{#each seriesNames as key (key)}
					<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
						{getLabel(key)}
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each sortedRows as row, i (row.time)}
				{@const dayLabel = getDayLabel(i)}
				{#if dayLabel}
					<tr class="bg-light-warm-grey/50">
						<td
							colspan={seriesNames.length + 1}
							class="px-2 py-1 text-xxs font-medium text-mid-grey"
						>
							{dayLabel}
						</td>
					</tr>
				{/if}
				<tr class="border-b border-light-warm-grey hover:bg-light-warm-grey/30 transition-colors">
					<td class="px-2 py-1 text-mid-grey tabular-nums whitespace-nowrap">
						{formatTime(row.time)}
					</td>
					{#each seriesNames as key (key)}
						<td class="px-2 py-1 text-right text-dark-grey tabular-nums whitespace-nowrap">
							{formatValue(row[key])}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if !data?.length}
		<div class="flex items-center justify-center py-8 text-mid-grey text-xs">
			No data available
		</div>
	{/if}
</div>
