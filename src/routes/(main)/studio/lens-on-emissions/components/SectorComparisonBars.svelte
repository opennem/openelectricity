<script>
	/**
	 * SectorComparisonBars Component
	 *
	 * Displays horizontal bars comparing sector contributions.
	 * Sectors are sorted by absolute value (largest first).
	 */
	import {
		formatEmissionsValue,
		calculateTotalAbsolute,
		calculatePercentage
	} from '../helpers/formatters.js';

	/**
	 * @typedef {Object} Props
	 * @property {Record<string, number> | null} data - Sector values from legend data
	 * @property {string[]} sectors - Array of sector keys
	 * @property {Record<string, string>} sectorColors - Map of sector key to color
	 * @property {Record<string, string>} sectorLabels - Map of sector key to display label
	 * @property {Set<string>} [hiddenSectors] - Set of hidden sector keys
	 * @property {string} [label] - Label showing the current period
	 */

	/** @type {Props} */
	let { data, sectors, sectorColors, sectorLabels, hiddenSectors = new Set(), label = 'Total' } = $props();

	// Filter out hidden sectors
	let visibleSectors = $derived(sectors.filter((s) => !hiddenSectors.has(s)));

	/**
	 * Sort sectors by absolute value (largest first) and compute percentages
	 */
	let sortedSectors = $derived.by(() => {
		if (!data) return [];

		// Calculate total absolute value (only visible sectors)
		const totalAbsolute = calculateTotalAbsolute(data, visibleSectors);

		// Map sectors with values and percentages
		const mapped = visibleSectors.map((sector) => {
			const value = data[sector] ?? 0;
			const percentage = calculatePercentage(value, totalAbsolute);
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
		<div class="flex items-center gap-2 mb-3">
			<h4 class="text-xs font-medium text-mid-warm-grey uppercase tracking-wide">
				Sector Comparison
			</h4>
			{#if label !== 'Total'}
				<span class="text-xs text-mid-grey">{label}</span>
			{/if}
		</div>

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
					<span class="w-14 text-right text-xs font-mono tabular-nums text-mid-grey flex-shrink-0">
						{isNegative ? '-' : ''}{formatEmissionsValue(value)}
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
