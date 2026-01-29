<script>
	/**
	 * SectorComparisonBars Component
	 *
	 * Displays horizontal bars comparing sector contributions.
	 * Sectors are sorted by absolute value (largest first).
	 */

	/**
	 * @typedef {Object} Props
	 * @property {Record<string, number> | null} data - Sector values from legend data
	 * @property {string[]} sectors - Array of sector keys
	 * @property {Record<string, string>} sectorColors - Map of sector key to color
	 * @property {Record<string, string>} sectorLabels - Map of sector key to display label
	 * @property {Set<string>} [hiddenSectors] - Set of hidden sector keys
	 */

	/** @type {Props} */
	let { data, sectors, sectorColors, sectorLabels, hiddenSectors = new Set() } = $props();

	// Filter out hidden sectors
	let visibleSectors = $derived(sectors.filter((s) => !hiddenSectors.has(s)));

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
	 * Sort sectors by absolute value (largest first) and compute percentages
	 */
	let sortedSectors = $derived.by(() => {
		if (!data) return [];

		// Calculate total absolute value (only visible sectors)
		const totalAbsolute = visibleSectors.reduce((sum, sector) => {
			return sum + Math.abs(data[sector] ?? 0);
		}, 0);

		// Map sectors with values and percentages
		const mapped = visibleSectors.map((sector) => {
			const value = data[sector] ?? 0;
			const percentage = totalAbsolute > 0 ? (Math.abs(value) / totalAbsolute) * 100 : 0;
			return { sector, value, percentage };
		});

		// Sort by absolute value descending
		return mapped.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
	});

	// Find max percentage for scaling bars
	let maxPercentage = $derived(
		sortedSectors.length > 0 ? Math.max(...sortedSectors.map((s) => s.percentage)) : 100
	);
</script>

{#if data && sortedSectors.length > 0}
	<div class="p-3">
		<h4 class="text-xs font-medium text-mid-warm-grey uppercase tracking-wide mb-3">
			Sector Comparison
		</h4>

		<div class="space-y-2">
			{#each sortedSectors as { sector, value, percentage } (sector)}
				{@const isNegative = value < 0}
				{@const barWidth = (percentage / maxPercentage) * 100}

				<div class="flex items-center gap-2">
					<!-- Color swatch and label -->
					<div class="w-28 flex items-center gap-2 flex-shrink-0">
						<span
							class="w-2.5 h-2.5 rounded-full flex-shrink-0"
							style="background-color: {sectorColors[sector]}"
						></span>
						<span class="text-xs text-dark-grey truncate">{sectorLabels[sector]}</span>
					</div>

					<!-- Bar -->
					<div class="flex-1 h-5 bg-light-warm-grey rounded overflow-hidden">
						<div
							class="h-full rounded transition-all duration-300"
							style="width: {barWidth}%; background-color: {sectorColors[sector]}"
						></div>
					</div>

					<!-- Value -->
					<span class="w-14 text-right text-xs tabular-nums text-mid-grey flex-shrink-0">
						{isNegative ? '-' : ''}{formatValue(value)}
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
