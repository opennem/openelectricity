<script>
	import { format as fmtNumber } from 'd3-format';
	import { format as fmtDate } from 'date-fns';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} dataset
	 * @property {string[]} seriesNames
	 * @property {Object<string, string>} seriesColours
	 * @property {Object<string, string>} seriesLabels
	 * @property {string} unit
	 */

	/** @type {Props} */
	let { dataset, seriesNames, seriesColours, seriesLabels, unit } = $props();

	const formatVal = fmtNumber('.1f');

	/** Newest first so the most recent month is visible without scrolling. */
	let rows = $derived(dataset.slice().reverse());

	/** @param {any} v */
	function format(v) {
		return v == null || (typeof v === 'number' && isNaN(v)) ? '–' : formatVal(v);
	}
</script>

<div class="max-h-[260px] overflow-auto border border-warm-grey rounded-md">
	<table class="w-full text-xs border-collapse">
		<thead class="sticky top-0 z-10 bg-white">
			<tr class="border-b border-mid-warm-grey">
				<th
					class="text-left font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap font-space uppercase"
				>
					Month
				</th>
				{#each seriesNames as name (name)}
					<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
						<span class="inline-flex items-center gap-1.5 align-middle">
							<span
								class="w-2.5 h-2.5 rounded-full shrink-0"
								style="background-color: {seriesColours[name] || '#999'}"
							></span>
							<span>{seriesLabels[name] ?? name} ({unit})</span>
						</span>
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each rows as row (row.time)}
				<tr class="border-b border-light-warm-grey hover:bg-light-warm-grey/40 transition-colors">
					<td class="px-2 py-1 text-dark-grey font-mono tabular-nums whitespace-nowrap">
						{fmtDate(/** @type {any} */ (row).date, 'MMM yyyy')}
					</td>
					{#each seriesNames as name (name)}
						<td
							class="px-2 py-1 text-right text-dark-grey font-mono tabular-nums whitespace-nowrap"
						>
							{format(/** @type {any} */ (row)[name])}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if !rows.length}
		<div class="flex items-center justify-center py-8 text-mid-grey text-xs">No data available</div>
	{/if}
</div>
