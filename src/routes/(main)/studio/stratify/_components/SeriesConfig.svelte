<script>
	import { TABLEAU_10 } from '../_utils/colour-palette.js';

	let {
		seriesNames = [],
		seriesLabels = $bindable({}),
		seriesColours = $bindable({}),
		hiddenSeries = $bindable([])
	} = $props();

	/**
	 * Cycle colour to the next in the palette
	 * @param {string} key
	 */
	function cycleColour(key) {
		const current = seriesColours[key];
		const idx = TABLEAU_10.indexOf(current);
		const next = TABLEAU_10[(idx + 1) % TABLEAU_10.length];
		seriesColours = { ...seriesColours, [key]: next };
	}

	/**
	 * Toggle series visibility
	 * @param {string} key
	 */
	function toggleVisibility(key) {
		if (hiddenSeries.includes(key)) {
			hiddenSeries = hiddenSeries.filter((k) => k !== key);
		} else {
			hiddenSeries = [...hiddenSeries, key];
		}
	}

	/**
	 * Update label for a series
	 * @param {string} key
	 * @param {string} label
	 */
	function updateLabel(key, label) {
		seriesLabels = { ...seriesLabels, [key]: label };
	}
</script>

{#if seriesNames.length > 0}
	<div>
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Series</span
		>
		<div class="space-y-2">
			{#each seriesNames as key (key)}
				{@const isHidden = hiddenSeries.includes(key)}
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => cycleColour(key)}
						class="w-5 h-5 rounded-full shrink-0 border border-mid-warm-grey"
						style:background-color={seriesColours[key] || '#ccc'}
						title="Click to change colour"
					></button>

					<input
						type="text"
						value={seriesLabels[key] || key}
						oninput={(e) => updateLabel(key, e.currentTarget.value)}
						class="bg-light-warm-grey border border-mid-warm-grey rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-dark-grey"
					/>

					<button
						type="button"
						onclick={() => toggleVisibility(key)}
						class="text-xs px-2 py-1 rounded {isHidden
							? 'text-mid-warm-grey line-through'
							: 'text-dark-grey'}"
						title={isHidden ? 'Show series' : 'Hide series'}
					>
						{isHidden ? 'Hidden' : 'Visible'}
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}
