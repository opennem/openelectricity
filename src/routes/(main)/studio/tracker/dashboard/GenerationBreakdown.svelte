<script>
	import { formatSI } from '$lib/utils/si-units.js';

	/** @type {{ dataset?: {data: any[], seriesNames: string[], seriesLabels: Record<string,string>, seriesColours?: Record<string,string>} | null, hiddenSeries?: string[], metric?: string, ontoggle?: (series: string) => void, standalone?: boolean }} */
	let {
		dataset = null,
		hiddenSeries = [],
		metric = 'power',
		ontoggle,
		standalone = false
	} = $props();

	let rows = $derived.by(() => {
		if (!dataset) return [];
		return [...dataset.seriesNames].reverse().map((series) => {
			const values = dataset.data
				.map((row) => row[series])
				.filter((value) => Number.isFinite(value));
			const rawValue =
				metric === 'energy'
					? values.reduce((sum, value) => sum + value, 0)
					: values.length
						? values.reduce((sum, value) => sum + value, 0) / values.length
						: 0;
			return {
				series,
				label: dataset.seriesLabels?.[series] ?? series,
				colour: dataset.seriesColours?.[series] ?? '#6a6a6a',
				value: Math.abs(rawValue),
				isLoad: rawValue < 0,
				hidden: hiddenSeries.includes(series)
			};
		});
	});

	let sourceRows = $derived(rows.filter((row) => !row.isLoad));
	let loadRows = $derived(rows.filter((row) => row.isLoad));
	let unit = $derived(metric === 'energy' ? 'MWh' : 'MW');

	/** @param {string} label */
	function mainLabel(label) {
		return label.split(' (')[0];
	}

	/** @param {string} label */
	function subLabel(label) {
		const parts = label.split(' (');
		return parts.length > 1 ? `(${parts.slice(1).join(' (')}` : '';
	}

	/** @param {KeyboardEvent} event @param {string} series */
	function handleRowKeydown(event, series) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		ontoggle?.(series);
	}
</script>

{#snippet tableRows(/** @type {typeof rows} */ items)}
	{#each items as row (row.series)}
		<tr
			onclick={() => ontoggle?.(row.series)}
			onkeydown={(event) => handleRowKeydown(event, row.series)}
			role="button"
			tabindex="0"
			aria-pressed={!row.hidden}
			class="group cursor-pointer text-sm hover:bg-light-warm-grey {row.hidden ? 'opacity-50' : ''}"
		>
			<td class="px-2 py-1.5">
				<div class="ml-3 flex items-center gap-3">
					<span
						class="size-6 shrink-0 rounded-sm border {row.hidden
							? 'border-mid-warm-grey bg-transparent group-hover:border-mid-grey'
							: ''}"
						style:background-color={row.hidden ? undefined : row.colour}
						style:border-color={row.hidden ? undefined : row.colour}
					></span>
					<span class="min-w-0 truncate text-dark-grey">
						{mainLabel(row.label)}
						<span class="text-mid-grey">{subLabel(row.label)}</span>
					</span>
				</div>
			</td>
			<td class="px-2 py-1.5">
				<div class="mr-3 text-right font-mono tabular-nums text-dark-grey">
					{formatSI(row.value, {
						baseUnit: metric === 'energy' ? unit : '',
						maximumFractionDigits: 1
					})}
				</div>
			</td>
		</tr>
	{/each}
{/snippet}

<div
	class="h-full overflow-auto {standalone
		? ''
		: 'border-t border-mid-warm-grey/40 md:border-t-0 md:border-l'}"
>
	{#if rows.length}
		<table class="w-full table-fixed">
			<thead class="border-b border-warm-grey bg-light-warm-grey">
				<tr>
					<th class="w-[62%] px-2 py-4 text-left text-sm font-medium">
						<span class="ml-3 block text-dark-grey">Technology</span>
					</th>
					<th class="px-2 py-4 text-right font-medium">
						<div class="mr-3 flex flex-col items-end">
							<span class="text-xs">{metric === 'energy' ? 'Generation' : 'Average'}</span>
							<span class="font-mono text-xxs font-light text-mid-grey">{unit}</span>
						</div>
					</th>
				</tr>
			</thead>

			{#if sourceRows.length}
				<thead>
					<tr>
						<th class="border-b border-warm-grey px-2 pb-1 pt-5 text-left text-sm font-medium">
							<span class="ml-3">Sources</span>
						</th>
						<th class="border-b border-warm-grey"></th>
					</tr>
				</thead>
				<tbody>{@render tableRows(sourceRows)}</tbody>
			{/if}

			{#if loadRows.length}
				<thead>
					<tr>
						<th class="border-b border-warm-grey px-2 pb-1 pt-5 text-left text-sm font-medium">
							<span class="ml-3">Loads</span>
						</th>
						<th class="border-b border-warm-grey"></th>
					</tr>
				</thead>
				<tbody>{@render tableRows(loadRows)}</tbody>
			{/if}
			<tfoot><tr><td class="h-4"></td></tr></tfoot>
		</table>
	{:else}
		<div class="bg-light-warm-grey px-4 py-4">
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-mid-grey">
				Technology
			</p>
		</div>
		<p class="m-0 px-4 py-6 text-xs text-mid-grey">Table appears when chart data loads.</p>
	{/if}
</div>
