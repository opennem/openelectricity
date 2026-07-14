<script>
	/**
	 * FuelTechTable — fuel-tech breakdown for the Explorer Generation panel.
	 *
	 * Reuses the scenarios table's visual language (colour-swatch rows, right-
	 * aligned values, a sources/loads split and a total) but is decoupled from the
	 * scenario context: it's fed purely by the Generation panel's `onvisibledata`
	 * callback plus the shared `hoverTime`, so the values track whatever timestamp
	 * the user is hovering (or the latest sample when not hovering).
	 */

	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { nearestIndexOfTime } from '$lib/components/charts/v2/binary-search.js';
	import { loadFuelTechs } from '$lib/fuel_techs';

	/**
	 * @typedef {Object} TableData
	 * @property {any[]} data - Aggregated chart rows ({ date, time, group: val, … })
	 * @property {string[]} seriesNames - Group ids in stack order
	 * @property {Record<string, string>} seriesLabels - Group id → label
	 */

	/**
	 * @typedef {Object} Props
	 * @property {TableData | null} tableData
	 * @property {number | undefined} [hoverTime] - Shared hover timestamp
	 * @property {'power' | 'energy'} [metric] - Drives the unit (MW vs MWh)
	 */

	/** @type {Props} */
	let { tableData = null, hoverTime = undefined, metric = 'power' } = $props();

	const loadSet = new Set(loadFuelTechs);

	/** Row whose values are shown — the hovered sample, else the latest. */
	let activeRow = $derived.by(() => {
		const rows = tableData?.data;
		if (!rows || rows.length === 0) return null;
		if (hoverTime == null) return rows[rows.length - 1];
		return rows[nearestIndexOfTime(rows, hoverTime)];
	});

	// Stack order is top-down in the legend, so reverse the chart's bottom-up order.
	let sourceNames = $derived(
		(tableData?.seriesNames ?? []).filter((id) => !loadSet.has(id)).reverse()
	);
	let loadNames = $derived(
		(tableData?.seriesNames ?? []).filter((id) => loadSet.has(id)).reverse()
	);

	/** @param {string} id */
	function labelFor(id) {
		return tableData?.seriesLabels?.[id] ?? id;
	}

	/** @param {string} id */
	function valueFor(id) {
		const v = activeRow?.[id];
		return typeof v === 'number' ? v : null;
	}

	let sourcesTotal = $derived(sourceNames.reduce((acc, id) => acc + (valueFor(id) ?? 0), 0));

	const unit = $derived(metric === 'energy' ? 'Wh' : 'W');

	/**
	 * Format a value (held in MW / MWh) with a GW/GWh rollover.
	 * @param {number | null} v
	 */
	function fmt(v) {
		if (v == null) return '—';
		const abs = Math.abs(v);
		if (abs >= 1000) {
			return `${(v / 1000).toLocaleString('en-AU', { maximumFractionDigits: 1 })} G${unit}`;
		}
		return `${v.toLocaleString('en-AU', { maximumFractionDigits: 0 })} M${unit}`;
	}
</script>

<div class="text-sm">
	{#if !tableData || tableData.seriesNames.length === 0}
		<div class="flex items-center justify-center h-full py-10 text-mid-warm-grey">
			<span class="text-xs">No data for this range.</span>
		</div>
	{:else}
		<table class="w-full border-collapse">
			<thead>
				<tr class="border-b border-warm-grey text-mid-grey">
					<th class="text-left font-space uppercase text-xs font-medium py-2 px-4">Fuel Tech</th>
					<th class="text-right font-space uppercase text-xs font-medium py-2 px-4">
						{metric === 'energy' ? 'Energy' : 'Power'}
					</th>
				</tr>
			</thead>
			<tbody>
				{#each sourceNames as id (id)}
					<tr class="border-b border-warm-grey/60 hover:bg-light-warm-grey/50">
						<td class="py-1.5 px-4">
							<span class="flex items-center gap-2">
								<span
									class="inline-block w-3 h-3 rounded-sm shrink-0"
									style:background-color={getFuelTechColour(id)}
								></span>
								<span>{labelFor(id)}</span>
							</span>
						</td>
						<td class="py-1.5 px-4 text-right font-mono tabular-nums">{fmt(valueFor(id))}</td>
					</tr>
				{/each}

				<tr class="border-b-2 border-mid-warm-grey font-semibold">
					<td class="py-2 px-4">Total generation</td>
					<td class="py-2 px-4 text-right font-mono tabular-nums">{fmt(sourcesTotal)}</td>
				</tr>

				{#if loadNames.length}
					<tr>
						<td colspan="2" class="pt-4 pb-1 px-4 font-space uppercase text-xs text-mid-grey">
							Loads
						</td>
					</tr>
					{#each loadNames as id (id)}
						<tr class="border-b border-warm-grey/60 hover:bg-light-warm-grey/50">
							<td class="py-1.5 px-4">
								<span class="flex items-center gap-2">
									<span
										class="inline-block w-3 h-3 rounded-sm shrink-0"
										style:background-color={getFuelTechColour(id)}
									></span>
									<span>{labelFor(id)}</span>
								</span>
							</td>
							<td class="py-1.5 px-4 text-right font-mono tabular-nums">{fmt(valueFor(id))}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	{/if}
</div>
