<script>
	/**
	 * EmissionsLegend Component
	 *
	 * Displays the legend for the emissions chart showing each sector
	 * with its color swatch, current value, and contribution percentage.
	 */
	import {
		formatEmissionsValue,
		formatPercentage,
		calculatePercentage,
		calculateTotalAbsolute,
		calculateNetTotal
	} from '../helpers/formatters.js';

	import { X } from '@lucide/svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} sectors - Array of sector keys in order
	 * @property {Record<string, string>} sectorColors - Map of sector key to color
	 * @property {Record<string, string>} sectorLabels - Map of sector key to display label
	 * @property {Record<string, number> | null} data - Current data point with sector values
	 * @property {string} [netTotalColor] - Color for the net total indicator
	 * @property {Set<string>} [hiddenSectors] - Set of hidden sector keys
	 * @property {(sector: string) => void} [ontoggle] - Callback when sector is toggled
	 * @property {string} [label] - Label showing the current period (e.g., "FY 2024" or "Total")
	 * @property {boolean} [isFocused] - Whether the legend is showing focused data
	 * @property {() => void} [onclearfocus] - Callback to clear focus
	 */

	/** @type {Props} */
	let {
		sectors,
		sectorColors,
		sectorLabels,
		data,
		netTotalColor = '#C74523',
		hiddenSectors = new Set(),
		ontoggle,
		label = 'Total',
		isFocused = false,
		onclearfocus
	} = $props();

	// Reverse sector order for display (net total stays at bottom)
	let displaySectors = $derived([...sectors].reverse());

	// Calculate totals using shared helpers
	let totalAbsolute = $derived(calculateTotalAbsolute(data, sectors));
	let netTotal = $derived(calculateNetTotal(data, sectors));
</script>

<div class="w-full">
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-light-warm-grey">
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-mid-warm-grey uppercase tracking-wide">Sector</span>
			{#if isFocused}
				<span
					class="text-xs font-semibold text-dark-grey bg-warm-grey px-2 py-0.5 rounded-full flex items-center gap-1"
				>
					{label}
					<button
						type="button"
						onclick={() => onclearfocus?.()}
						class="hover:text-mid-grey transition-colors cursor-pointer"
						title="Clear focus"
					>
						<X size={12} />
					</button>
				</span>
			{:else if label !== 'Total'}
				<span class="text-xs text-mid-grey">{label}</span>
			{/if}
		</div>
		<span class="text-xs font-medium text-mid-warm-grey uppercase tracking-wide"
			>Emissions / Contribution</span
		>
	</div>

	<!-- Sector List (reversed order) -->
	<div class="divide-y divide-light-warm-grey">
		{#each displaySectors as sector (sector)}
			{@const value = data?.[sector] ?? 0}
			{@const percentage = calculatePercentage(value, totalAbsolute)}
			{@const isNegative = value < 0}
			{@const isHidden = hiddenSectors.has(sector)}

			<button
				type="button"
				class="w-full flex items-center justify-between px-3 py-2.5 hover:bg-light-warm-grey/50 cursor-pointer transition-opacity {isHidden
					? 'opacity-40'
					: ''}"
				onclick={() => ontoggle?.(sector)}
			>
				<!-- Left: Color swatch and label -->
				<div class="flex items-center gap-2.5">
					<span
						class="w-3 h-3 rounded-full flex-shrink-0 transition-opacity"
						style="background-color: {sectorColors[sector]}"
					></span>
					<span class="text-sm text-dark-grey {isHidden ? 'line-through' : ''}"
						>{sectorLabels[sector]}</span
					>
				</div>

				<!-- Right: Value and percentage -->
				<div class="flex items-center gap-3">
					<span class="text-sm font-medium text-dark-grey font-mono tabular-nums">
						{isNegative ? '-' : ''}{formatEmissionsValue(value)}
					</span>
					<div class="flex items-center gap-1.5 min-w-[60px] justify-end">
						<div class="w-12 h-1.5 bg-light-warm-grey rounded-full overflow-hidden">
							<div
								class="h-full rounded-full transition-all duration-300"
								style="width: {Math.min(percentage, 100)}%; background-color: {sectorColors[
									sector
								]}"
							></div>
						</div>
						<span class="text-xs text-mid-warm-grey font-mono tabular-nums w-10 text-right">
							{formatPercentage(percentage)}
						</span>
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Net Total Row -->
	<div
		class="flex items-center justify-between px-3 py-3 border-t-2 border-light-warm-grey bg-light-warm-grey/30"
	>
		<!-- Left: Line indicator and label -->
		<div class="flex items-center gap-2.5">
			<span class="w-3 h-0.5 flex-shrink-0" style="background-color: {netTotalColor}"></span>
			<span class="text-sm font-semibold text-dark-grey">Net Total</span>
		</div>

		<!-- Right: Value -->
		<div class="flex items-center">
			<span class="text-sm font-semibold text-dark-grey font-mono tabular-nums">
				{netTotal < 0 ? '-' : ''}{formatEmissionsValue(netTotal)}
			</span>
		</div>
	</div>
</div>
