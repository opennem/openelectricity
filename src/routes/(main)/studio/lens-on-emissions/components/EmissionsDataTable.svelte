<script>
	/**
	 * EmissionsDataTable Component
	 *
	 * Displays a collapsible table showing emissions data for all sectors by year.
	 * Shows data in reverse chronological order (newest first).
	 */
	import Icon from '$lib/components/Icon.svelte';

	/**
	 * @typedef {import('../helpers/csv-parser.js').EmissionsDataPoint} EmissionsDataPoint
	 */

	/**
	 * @typedef {Object} Props
	 * @property {EmissionsDataPoint[]} chartData - Processed emissions data
	 * @property {string[]} sectors - Array of sector keys in order
	 * @property {Record<string, string>} sectorColors - Map of sector key to color
	 * @property {Record<string, string>} sectorLabels - Map of sector key to display label
	 * @property {boolean} [initiallyOpen] - Whether table starts expanded
	 * @property {'year' | 'quarter'} [intervalType] - Current interval type
	 * @property {Set<string>} [hiddenSectors] - Set of hidden sector keys
	 */

	/** @type {Props} */
	let {
		chartData,
		sectors,
		sectorColors,
		sectorLabels,
		initiallyOpen = false,
		intervalType = 'year',
		hiddenSectors = new Set()
	} = $props();

	// Filter out hidden sectors
	let visibleSectors = $derived(sectors.filter((s) => !hiddenSectors.has(s)));

	let isOpen = $state(initiallyOpen);

	function toggleTable() {
		isOpen = !isOpen;
	}

	/**
	 * Format a number with commas and one decimal place
	 * @param {number} value
	 * @returns {string}
	 */
	function formatValue(value) {
		return Math.abs(value).toLocaleString('en-AU', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		});
	}

	/**
	 * Get the row label based on interval type
	 * @param {EmissionsDataPoint} row
	 * @returns {string}
	 */
	function getRowLabel(row) {
		if (intervalType === 'quarter' && row.quarter) {
			return String(row.quarter);
		}
		return `FY ${row.fy}`;
	}

	// Reverse data for display (newest first)
	let displayData = $derived([...chartData].reverse());
</script>

<div class="mt-6 border border-light-warm-grey rounded-lg overflow-hidden">
	<!-- Collapsible Header -->
	<button
		onclick={toggleTable}
		class="w-full flex items-center justify-between px-4 py-3 bg-light-warm-grey hover:bg-warm-grey transition-colors cursor-pointer"
	>
		<span class="text-sm font-medium text-dark-grey">Detailed Data Table</span>
		<Icon
			icon="chev-up"
			class="transition-transform origin-center {isOpen ? '' : 'rotate-180'}"
			size={16}
		/>
	</button>

	<!-- Table Content -->
	{#if isOpen}
		<div class="overflow-x-auto max-h-[400px] overflow-y-auto">
			<table class="w-full text-sm">
				<thead class="sticky top-0 bg-white border-b border-warm-grey z-10">
					<tr>
						<th class="px-3 py-3 text-left text-xs font-medium text-mid-warm-grey whitespace-nowrap">
							{intervalType === 'quarter' ? 'Quarter' : 'FY'}
						</th>
						{#each visibleSectors as sector}
							<th class="px-3 py-3 text-right text-xs font-medium text-mid-warm-grey whitespace-nowrap">
								<div class="flex items-center justify-end gap-1.5">
									<span
										class="w-2 h-2 rounded-full flex-shrink-0"
										style="background-color: {sectorColors[sector]}"
									></span>
									<span class="truncate max-w-[100px]">{sectorLabels[sector]}</span>
								</div>
							</th>
						{/each}
						<th class="px-3 py-3 text-right text-xs font-semibold text-dark-grey whitespace-nowrap">
							Net Total
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-light-warm-grey">
					{#each displayData as row (String(row.fy) + (row.quarter ? String(row.quarter) : ''))}
						<tr class="hover:bg-light-warm-grey/50">
							<td class="px-3 py-2 text-sm font-medium text-dark-grey whitespace-nowrap">
								{getRowLabel(row)}
							</td>
							{#each visibleSectors as sector}
								{@const value = Number(row[sector]) || 0}
								{@const isNegative = value < 0}
								<td class="px-3 py-2 text-right text-sm tabular-nums text-mid-grey whitespace-nowrap">
									{isNegative ? '-' : ''}{formatValue(value)}
								</td>
							{/each}
							<td class="px-3 py-2 text-right text-sm font-semibold tabular-nums text-dark-grey whitespace-nowrap">
								{row.net_total < 0 ? '-' : ''}{formatValue(row.net_total)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
