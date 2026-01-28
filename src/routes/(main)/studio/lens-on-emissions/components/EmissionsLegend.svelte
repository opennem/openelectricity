<script>
	/**
	 * EmissionsLegend Component
	 *
	 * Displays the legend for the emissions chart showing each sector
	 * with its color swatch, current value, and contribution percentage.
	 */

	/**
	 * @typedef {Object} Props
	 * @property {string[]} sectors - Array of sector keys in order
	 * @property {Record<string, string>} sectorColors - Map of sector key to color
	 * @property {Record<string, string>} sectorLabels - Map of sector key to display label
	 * @property {Record<string, number> | null} data - Current data point with sector values
	 * @property {string} [netTotalColor] - Color for the net total indicator
	 */

	/** @type {Props} */
	let {
		sectors,
		sectorColors,
		sectorLabels,
		data,
		netTotalColor = '#C74523'
	} = $props();

	// Reverse sector order for display (net total stays at bottom)
	let displaySectors = $derived([...sectors].reverse());

	/**
	 * Calculate total of all positive values for percentage calculation
	 */
	let totalAbsolute = $derived.by(() => {
		if (!data) return 0;
		return sectors.reduce((sum, sector) => {
			const value = data[sector] ?? 0;
			return sum + Math.abs(value);
		}, 0);
	});

	/**
	 * Calculate net total (sum of all values, including negative)
	 */
	let netTotal = $derived.by(() => {
		if (!data) return 0;
		return sectors.reduce((sum, sector) => {
			return sum + (data[sector] ?? 0);
		}, 0);
	});

	/**
	 * Format a number with commas and one decimal place
	 * @param {number} value
	 * @returns {string}
	 */
	function formatValue(value) {
		return value.toLocaleString('en-AU', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		});
	}

	/**
	 * Calculate percentage contribution
	 * @param {number} value
	 * @returns {number}
	 */
	function calculatePercentage(value) {
		if (totalAbsolute === 0) return 0;
		return (Math.abs(value) / totalAbsolute) * 100;
	}

	/**
	 * Format percentage with one decimal place
	 * @param {number} percentage
	 * @returns {string}
	 */
	function formatPercentage(percentage) {
		return percentage.toFixed(1) + '%';
	}
</script>

<div class="w-full">
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-light-warm-grey">
		<span class="text-xs font-medium text-mid-warm-grey uppercase tracking-wide">Sector</span>
		<span class="text-xs font-medium text-mid-warm-grey uppercase tracking-wide"
			>Emissions / Contribution</span
		>
	</div>

	<!-- Sector List (reversed order) -->
	<div class="divide-y divide-light-warm-grey">
		{#each displaySectors as sector (sector)}
			{@const value = data?.[sector] ?? 0}
			{@const percentage = calculatePercentage(value)}
			{@const isNegative = value < 0}

			<div class="flex items-center justify-between px-3 py-2.5 hover:bg-light-warm-grey/50">
				<!-- Left: Color swatch and label -->
				<div class="flex items-center gap-2.5">
					<span
						class="w-3 h-3 rounded-full flex-shrink-0"
						style="background-color: {sectorColors[sector]}"
					></span>
					<span class="text-sm text-dark-grey">{sectorLabels[sector]}</span>
				</div>

				<!-- Right: Value and percentage -->
				<div class="flex items-center gap-3">
					<span class="text-sm font-medium text-dark-grey tabular-nums">
						{isNegative ? '-' : ''}{formatValue(Math.abs(value))}
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
						<span class="text-xs text-mid-warm-grey tabular-nums w-10 text-right">
							{formatPercentage(percentage)}
						</span>
					</div>
				</div>
			</div>
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
			<span class="text-sm font-semibold text-dark-grey tabular-nums">
				{netTotal < 0 ? '-' : ''}{formatValue(Math.abs(netTotal))}
			</span>
		</div>
	</div>
</div>
