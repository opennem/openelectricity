<script>
	import { format as fmtNumber } from 'd3-format';
	import { format as fmtDate } from 'date-fns';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} dataset
	 * @property {string[]} seriesNames
	 * @property {Object<string, string>} seriesColours
	 * @property {Object<string, string>} seriesLabels
	 * @property {number | undefined} hoverTime
	 * @property {string} unit
	 */

	/** @type {Props} */
	let { dataset, seriesNames, seriesColours, seriesLabels, hoverTime, unit } = $props();

	const formatVal = fmtNumber('.1f');

	let point = $derived(
		hoverTime != null
			? dataset.find((/** @type {any} */ d) => d.time === hoverTime)
			: dataset[dataset.length - 1]
	);
</script>

<div class="w-[350px] shrink-0 text-xs text-mid-grey">
	{#if point}
		<p class="font-space text-xs uppercase mb-2 text-dark-grey">
			{fmtDate(/** @type {any} */ (point).date, 'MMM yyyy')}
		</p>
		<div class="space-y-1.5">
			{#each seriesNames as name (name)}
				{@const value = /** @type {any} */ (point)[name]}
				<div class="flex items-center gap-2">
					<span
						class="w-3 h-3 rounded-full shrink-0"
						style="background-color: {seriesColours[name] || '#999'}"
					></span>
					<span class="flex-1 truncate" title={seriesLabels[name] ?? name}>
						{seriesLabels[name] ?? name}
					</span>
					<span class="text-base font-semibold tabular-nums text-dark-grey">
						{value == null ? '–' : formatVal(value)}
					</span>
					<span class="text-xs">{unit}</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-mid-grey italic">No data</p>
	{/if}
</div>
