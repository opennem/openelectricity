<script>
	import { TABLEAU_10 } from '$lib/stratify/colour-palette.js';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();

	/**
	 * Cycle colour to the next in the palette
	 * @param {string} key
	 */
	function cycleColour(key) {
		const current = project.seriesColours[key];
		const idx = TABLEAU_10.indexOf(current);
		const next = TABLEAU_10[(idx + 1) % TABLEAU_10.length];
		project.userSeriesColours = { ...project.userSeriesColours, [key]: next };
	}

	/**
	 * Toggle series visibility
	 * @param {string} key
	 */
	function toggleVisibility(key) {
		if (project.hiddenSeries.includes(key)) {
			project.hiddenSeries = project.hiddenSeries.filter((k) => k !== key);
		} else {
			project.hiddenSeries = [...project.hiddenSeries, key];
		}
	}

	/**
	 * Update label for a series
	 * @param {string} key
	 * @param {string} label
	 */
	function updateLabel(key, label) {
		project.userSeriesLabels = { ...project.userSeriesLabels, [key]: label };
	}
</script>

{#if project.parsedData.seriesNames.length > 0}
	<div>
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Series</span
		>
		<div class="space-y-2">
			{#each project.parsedData.seriesNames as key (key)}
				{@const isHidden = project.hiddenSeries.includes(key)}
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => cycleColour(key)}
						class="w-5 h-5 rounded-full shrink-0 border border-mid-warm-grey"
						style:background-color={project.seriesColours[key] || '#ccc'}
						title="Click to change colour"
					></button>

					<input
						type="text"
						value={project.seriesLabels[key] || key}
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
