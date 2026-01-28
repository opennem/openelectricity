<script>
	/**
	 * @typedef {Object} Props
	 * @property {'quarter' | 'year'} intervalType - Current interval type
	 * @property {boolean} showHistory - Whether to show historical data
	 * @property {boolean} showProjections - Whether to show projections
	 * @property {boolean} [useRollingSum] - Whether to show rolling yearly sum (quarter mode only)
	 * @property {(type: 'quarter' | 'year') => void} onIntervalChange - Interval change handler
	 * @property {(show: boolean) => void} onHistoryChange - History toggle handler
	 * @property {(show: boolean) => void} onProjectionsChange - Projections toggle handler
	 * @property {(show: boolean) => void} [onRollingSumChange] - Rolling sum toggle handler
	 */

	/** @type {Props} */
	let {
		intervalType,
		showHistory,
		showProjections,
		useRollingSum = false,
		onIntervalChange,
		onHistoryChange,
		onProjectionsChange,
		onRollingSumChange
	} = $props();

	// Determine which mode we're in
	let isQuarterMode = $derived(intervalType === 'quarter');
	let isYearMode = $derived(intervalType === 'year');
</script>

<div class="flex flex-wrap items-center gap-5">
	<!-- Interval Toggle (Quarter/Year) -->
	<div class="flex rounded-full bg-white p-0.5">
		<button
			type="button"
			class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {isQuarterMode
				? 'bg-dark-grey text-white'
				: 'text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onIntervalChange('quarter')}
		>
			Quarter
		</button>
		<button
			type="button"
			class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {isYearMode
				? 'bg-dark-grey text-white'
				: 'text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onIntervalChange('year')}
		>
			Year
		</button>
	</div>

	<!-- Year mode options -->
	{#if isYearMode}
		<!-- History Toggle -->
		<button
			type="button"
			class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {showHistory
				? 'bg-dark-grey text-white'
				: 'bg-white text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onHistoryChange(!showHistory)}
		>
			<span>History</span>
			<span class="text-xs {showHistory ? 'text-mid-warm-grey' : 'text-mid-grey'}">
				FY 1990 — 2004
			</span>
		</button>

		<!-- Projections Toggle -->
		<button
			type="button"
			class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {showProjections
				? 'bg-dark-grey text-white'
				: 'bg-white text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onProjectionsChange(!showProjections)}
		>
			<span>Projections</span>
			<span class="text-xs {showProjections ? 'text-mid-warm-grey' : 'text-mid-grey'}">
				FY 2026 — 2040
			</span>
		</button>
	{/if}

	<!-- Quarter mode options -->
	{#if isQuarterMode}
		<!-- Rolling Yearly Sum Toggle -->
		<button
			type="button"
			class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {useRollingSum
				? 'bg-dark-grey text-white'
				: 'bg-white text-dark-grey hover:bg-warm-grey'}"
			onclick={() => onRollingSumChange?.(!useRollingSum)}
		>
			<span>Rolling Year</span>
		</button>
	{/if}
</div>
