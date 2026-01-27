<script>
	/**
	 * @typedef {Object} Props
	 * @property {'quarter' | 'year'} intervalType - Current interval type
	 * @property {boolean} showHistory - Whether to show historical data
	 * @property {boolean} showProjections - Whether to show projections
	 * @property {boolean} isHistoryDisabled - Whether history toggle is disabled
	 * @property {(type: 'quarter' | 'year') => void} onIntervalChange - Interval change handler
	 * @property {(show: boolean) => void} onHistoryChange - History toggle handler
	 * @property {(show: boolean) => void} onProjectionsChange - Projections toggle handler
	 */

	/** @type {Props} */
	let {
		intervalType,
		showHistory,
		showProjections,
		isHistoryDisabled,
		onIntervalChange,
		onHistoryChange,
		onProjectionsChange
	} = $props();
</script>

<div class="flex flex-wrap items-center gap-3">
	<!-- Interval Toggle (Quarter/Year) -->
	<div class="flex rounded-full bg-light-warm-grey p-0.5">
		<button
			type="button"
			class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {intervalType === 'quarter'
				? 'bg-dark-grey text-white'
				: 'text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onIntervalChange('quarter')}
		>
			Quarter
		</button>
		<button
			type="button"
			class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {intervalType === 'year'
				? 'bg-dark-grey text-white'
				: 'text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onIntervalChange('year')}
		>
			Year
		</button>
	</div>

	<!-- History Toggle -->
	<button
		type="button"
		class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors {isHistoryDisabled
			? 'opacity-40 cursor-not-allowed bg-light-warm-grey text-mid-warm-grey'
			: showHistory
				? 'bg-dark-grey text-white cursor-pointer'
				: 'bg-light-warm-grey text-dark-grey hover:bg-warm-grey cursor-pointer'}"
		disabled={isHistoryDisabled}
		onclick={() => !isHistoryDisabled && onHistoryChange(!showHistory)}
	>
		<span>History</span>
		<span class="text-xs {showHistory && !isHistoryDisabled ? 'text-mid-warm-grey' : 'text-mid-grey'}">
			FY 1990 — 2004
		</span>
	</button>

	<!-- Projections Toggle -->
	<button
		type="button"
		class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {showProjections
			? 'bg-dark-grey text-white'
			: 'bg-light-warm-grey text-dark-grey hover:bg-warm-grey'}"
		onclick={() => onProjectionsChange(!showProjections)}
	>
		<span>Projections</span>
		<span class="text-xs {showProjections ? 'text-mid-warm-grey' : 'text-mid-grey'}">
			FY 2026 — 2040
		</span>
	</button>
</div>
