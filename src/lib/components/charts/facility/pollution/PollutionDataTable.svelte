<script>
	import { CATEGORY_META } from './pollution-constants.js';
	import Sparkline from './Sparkline.svelte';

	/** @type {{ data: import('./transform-pollution.js').PollutionData }} */
	let { data } = $props();

	/** @type {string[]} */
	let categoryOrder = $derived(
		Object.keys(CATEGORY_META).filter((key) => data.byCategory[key]?.length)
	);

	let totalColumns = $derived(3 + data.years.length);

	/**
	 * @param {number | null} value
	 */
	function formatValue(value) {
		if (value == null) return '—';
		return value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
	}
</script>

<div class="overflow-x-auto">
	<table class="w-full text-[11px] font-mono">
		<thead>
			<tr>
				<th class="py-1.5 pr-3 text-left text-mid-grey font-normal whitespace-nowrap">Pollutant</th>
				<th class="py-1.5 pr-3 text-left text-mid-grey font-normal whitespace-nowrap">Unit</th>
				<th class="py-1.5 pr-3 text-left text-mid-grey font-normal whitespace-nowrap">Trend</th>
				{#each data.years as year (year)}
					<th class="py-1.5 px-2 text-right text-mid-grey font-normal whitespace-nowrap border-l border-warm-grey/30">
						{year}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each categoryOrder as catKey (catKey)}
				{@const catMeta = CATEGORY_META[catKey]}
				{@const pollutants = data.byCategory[catKey]}

				<!-- Category sub-header -->
				<tr>
					<td
						colspan={totalColumns}
						class="text-[10px] text-mid-grey uppercase tracking-widest pt-4 pb-1 border-b border-dark-grey font-sans"
					>
						{catMeta.label}
					</td>
				</tr>

				<!-- Pollutant rows -->
				{#each pollutants as pollutant (pollutant.code)}
					{@const yearValues = data.years.map((y) => pollutant.values[y] ?? null)}

					<tr class="border-b border-warm-grey/40">
						<td class="py-1.5 pr-3 text-dark-grey whitespace-nowrap">
							<span class="inline-flex items-center gap-1.5">
								<span
									class="inline-block w-1.5 h-1.5 rounded-full shrink-0"
									style:background-color={catMeta.colour}
								></span>
								{pollutant.label}
							</span>
						</td>
						<td class="py-1.5 pr-3 text-mid-grey whitespace-nowrap">{pollutant.unit}</td>
						<td class="py-1.5 pr-3 whitespace-nowrap">
							<Sparkline
								values={yearValues}
								colour={catMeta.colour}
								ariaLabel="Trend for {pollutant.label}"
							/>
						</td>
						{#each data.years as year (year)}
							<td class="py-1.5 px-2 text-right tabular-nums text-dark-grey whitespace-nowrap border-l border-warm-grey/30">
								{formatValue(pollutant.values[year] ?? null)}
							</td>
						{/each}
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>
