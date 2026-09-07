<script>
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { getTimeFormatPolicy } from '$lib/components/charts/v2/time-format-policy.js';
	import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { comparisonBuckets, comparisonRows, comparisonCsv } from './comparison.js';

	/** @type {{snapshot: import('./types.js').GenerationSnapshot | null,
	 * selection: import('./comparison.js').Comparison, hidden: string[], pending: boolean,
	 * error: string | null, region: string, zone: string, interval: string,
	 * energy: boolean, prefix: SiPrefix,
	 * onchange: (value: import('./comparison.js').Comparison | null) => void}} */
	let {
		snapshot,
		selection,
		hidden,
		pending,
		error,
		region,
		zone,
		interval,
		energy,
		prefix,
		onchange
	} = $props();
	const sides = /** @type {const} */ (['a', 'b']);
	let buckets = $derived(comparisonBuckets(snapshot));
	let rows = $derived(comparisonRows(snapshot, selection, hidden));
	let formatDate = $derived(getTimeFormatPolicy(interval, ianaFromOffset(zone)).formatTooltip);
	let aAvailable = $derived(buckets.some((row) => row.time === selection.a));
	let bAvailable = $derived(buckets.some((row) => row.time === selection.b));
	let ready = $derived(!pending && !error && aAvailable && bAvailable);
	let canExport = $derived(ready && rows.some((row) => row.delta !== null));
	let chart = $derived.by(() => {
		const next = new ChartStore({
			key: Symbol('date-comparison'),
			title: 'Change (B − A)',
			prefix: 'M',
			displayPrefix: prefix,
			baseUnit: energy ? 'Wh' : 'W',
			chartType: 'bar-stacked',
			hideDataOptions: true,
			hideChartTypeOptions: true
		});
		next.isCategoryChart = true;
		next.xKey = 'category';
		next.seriesNames = rows.map((row) => row.id);
		next.seriesLabels = Object.fromEntries(rows.map((row) => [row.id, row.label]));
		next.seriesColours = Object.fromEntries(rows.map((row) => [row.id, row.colour]));
		// One independent signed bar per technology, not a cumulative generation stack.
		// The shared store's type is time-series-only; category mode consumes
		// category-keyed rows without fabricated timestamps.
		next.seriesData = /** @type {any[]} */ (
			rows.map((row) => ({ category: row.label, [row.id]: row.delta }))
		);
		next.useDivergingStack = true;
		next.chartStyles.chartHeightPx = 280;
		next.chartTooltips.showTotal = false;
		return next;
	});
	/** @param {'a' | 'b'} side @param {string} value */
	function choose(side, value) {
		onchange({ ...selection, [side]: value ? Number(value) : null });
	}
	/** @param {number | null} value */
	function format(value) {
		return value === null ? '—' : chart.convertAndFormatValue(value);
	}
	function download() {
		if (!canExport) return;
		downloadCsv(
			comparisonCsv(rows, {
				region,
				zone,
				interval,
				a: formatDate(/** @type {number} */ (selection.a)),
				b: formatDate(/** @type {number} */ (selection.b)),
				unit: energy ? 'MWh' : 'MW'
			}),
			`openelectricity-${region}-comparison.csv`
		);
	}
</script>

<section
	data-tracker-png={JSON.stringify({
		id: 'comparison',
		label: 'Two-date comparison',
		ready: canExport,
		caption: canExport
			? `A: ${formatDate(/** @type {number} */ (selection.a))} · B: ${formatDate(/** @type {number} */ (selection.b))} · Change (B − A)`
			: ''
	})}
	aria-label="Two-date comparison"
	aria-busy={pending}
	class="mb-4 rounded-lg border border-mid-warm-grey/40 bg-white p-4"
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h3 class="m-0 font-space text-sm font-semibold">Compare dates</h3>
		<button class="text-xs underline" onclick={() => onchange(null)}>Close comparison</button>
	</div>
	<p class="my-3 text-xs text-mid-grey">
		Select two displayed intervals from the current timeline. Values are absolute {energy
			? 'energy'
			: 'power'}; timeline transforms do not apply. UTC{zone}.
	</p>
	<div class="flex flex-wrap items-end gap-3 text-xs">
		{#each sides as side (side)}
			{@const selectedTime = selection[side]}
			<label class="flex min-w-0 flex-col gap-1"
				>Date {side.toUpperCase()}
				<select
					class="max-w-full rounded border border-warm-grey bg-white p-2"
					disabled={pending || !!error}
					value={selection[side] ?? ''}
					onchange={(event) => choose(/** @type {'a' | 'b'} */ (side), event.currentTarget.value)}
				>
					<option value="">Select an interval</option>
					{#if selectedTime !== null && !buckets.some((row) => row.time === selectedTime)}
						<option value={selectedTime}>Unavailable: {formatDate(selectedTime)}</option>
					{/if}
					{#each buckets as bucket (bucket.time)}<option value={bucket.time}
							>{formatDate(bucket.time)}</option
						>{/each}
				</select>
			</label>
		{/each}
		<button
			class="rounded border border-warm-grey px-3 py-2"
			onclick={() => onchange({ a: selection.b, b: selection.a })}>Swap A and B</button
		>
		<button
			class="rounded border border-warm-grey px-3 py-2 disabled:opacity-40"
			disabled={!canExport}
			onclick={download}>Download comparison CSV</button
		>
	</div>
	{#if error}
		<p role="status" class="my-4 text-sm">
			Comparison unavailable: {error}. Retry the generation chart to reload its data.
		</p>
	{:else if pending}
		<p role="status" class="my-4 text-sm">Loading comparison data…</p>
	{:else if !ready}
		<p role="status" class="my-4 text-sm">
			Select two available intervals. Dates outside this range or filter are unavailable; change the
			timeline range to include them.
		</p>
	{:else if !rows.length}
		<p role="status" class="my-4 text-sm">
			All fuel technologies are hidden. Show technologies in the table to compare them.
		</p>
	{:else}
		{#if !canExport}
			<p role="status" class="my-4 text-sm">
				No comparable readings for these intervals. Missing readings are shown below, not replaced
				with zero.
			</p>
		{/if}
		<div class="mt-4 overflow-x-auto">
			<div style:min-width={`${Math.max(300, rows.length * 70)}px`}>
				<StratumChart
					{chart}
					showOptions={false}
					defaultTooltipText="Hover a bar or focus a technology below to inspect its change"
				/>
			</div>
		</div>
		<div class="mt-3 overflow-x-auto">
			<table class="w-full whitespace-nowrap text-right font-space text-xs">
				<caption class="py-2 text-left"
					>A: {formatDate(/** @type {number} */ (selection.a))} · B: {formatDate(
						/** @type {number} */ (selection.b)
					)} · {chart.chartOptions.displayUnit}</caption
				>
				<thead
					><tr
						><th scope="col">Technology</th><th scope="col">A</th><th scope="col">B</th><th
							scope="col">Change (B − A)</th
						><th scope="col">Change (%)</th></tr
					></thead
				>
				<tbody>
					{#each rows as row (row.id)}
						<tr
							><th scope="row" class="text-left">
								<button
									class="flex items-center gap-2"
									onfocus={() => chart.setHoverCategory(row.label, row.id)}
									onblur={() => chart.clearHover()}
									onclick={() => chart.setHoverCategory(row.label, row.id)}
								>
									<span class="size-3 rounded-sm" style:background={row.colour}></span>{row.label}
								</button>
							</th><td>{format(row.a)}</td><td>{format(row.b)}</td><td>{format(row.delta)}</td><td
								>{row.percent === null
									? '—'
									: `${row.percent.toLocaleString('en-AU', { maximumFractionDigits: 1 })}%`}</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-xs text-mid-grey">
			Change = B − A; percentage = (B − A) ÷ |A| × 100. Negative loads stay signed. Missing readings
			and zero percentage baselines show —. Each date uses its displayed interval, which may be
			partial or rolling; this is not a whole-window total.
		</p>
	{/if}
</section>

<style>
	th,
	td {
		padding: 0.8rem;
		border-bottom: 1px solid #eee;
	}
</style>
