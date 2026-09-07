<script>
	import ProfileChart from './ProfileChart.svelte';
	import { stackedProfileRows } from './profile-chart.js';
	import { buildAverageDayStack } from './time-of-day.js';
	/** @type {{manager: import('$lib/components/charts/v2/ChartDataManager.svelte.js').default | null,
	 * window: ReturnType<typeof import('./time-of-day.js').profileWindow>, zone: string, groupLabel: string}} */
	let { manager, window, zone, groupLabel } = $props();
	let error = $derived(manager?.getErrorForRange(window.start, window.end));
	let pending = $derived(
		!error &&
			(!manager || !manager.initialLoadComplete || manager.hasPendingFetch || manager.isLoading)
	);
	let meta = $derived(manager?.seriesMeta);
	let layers = $derived(
		buildAverageDayStack(
			manager?.getDataForRange(window.start, window.end) ?? [],
			meta?.seriesNames ?? [],
			window
		)
	);
	let available = $derived(layers.some((layer) => layer.points.some((point) => point.y1 !== null)));
	let chartRows = $derived(stackedProfileRows(layers));
	const format = (/** @type {number | null} */ value) =>
		value === null ? '—' : value.toLocaleString('en-AU', { maximumFractionDigits: 1 });
</script>

<section
	class="my-6 border-y border-warm-grey py-5"
	aria-label="Average day fuel technology stack"
	aria-busy={pending}
>
	<p class="text-xs text-mid-grey">
		{groupLabel} · MW · UTC{zone} · {window.dates.length} days. Smooth average power; negative generation,
		charging and pumping pull the stack down.
	</p>
	{#if error}
		<p class="my-4 text-sm">Average-day overview unavailable: {error}</p>
		<button
			class="rounded border border-warm-grey px-3 py-2 text-xs"
			onclick={() => manager?.requestRange(window.start, window.end, { immediate: true })}
			>Retry average-day overview</button
		>
	{:else if pending}
		<p class="py-10 text-center text-sm">Loading average-day overview…</p>
	{:else}
		{#if available}
			<ProfileChart
				rows={chartRows}
				names={meta?.seriesNames ?? []}
				labels={meta?.seriesLabels ?? {}}
				colours={meta?.seriesColours ?? {}}
				title="Average day · All fuel technologies"
				{zone}
				stacked
			/>
		{:else}
			<p class="py-10 text-center text-sm">
				No complete average-day stack available for this window.
			</p>
		{/if}
		<p class="mt-3 text-xs text-mid-grey">
			Each technology averages its available days independently. A missing technology leaves a gap
			in the whole stack; a gap is not zero. Timeline visibility does not hide technologies here.
		</p>
		{#if layers.length}
			<details class="mt-3">
				<summary class="cursor-pointer text-sm">All-technology averages and coverage</summary>
				<div class="overflow-x-auto">
					<table class="w-full whitespace-nowrap text-right font-space text-xs">
						<caption class="py-2 text-left"
							>Average power (MW), UTC{zone}, {window.dates[0]}–{window.lastDate}. Brackets: days
							available out of {window.dates.length}.</caption
						>
						<thead
							><tr
								><th scope="col">Time</th>{#each layers as layer (layer.name)}<th scope="col"
										>{meta?.seriesLabels[layer.name] ?? layer.name}</th
									>{/each}</tr
							></thead
						>
						<tbody
							>{#each layers[0].points as point, i (point.minute)}<tr
									><th scope="row">{point.label}</th>{#each layers as layer (layer.name)}<td
											>{format(layer.points[i].value)} ({layer.points[i].days})</td
										>{/each}</tr
								>{/each}</tbody
						>
					</table>
				</div>
			</details>
		{/if}
	{/if}
</section>

<style>
	th,
	td {
		padding: 0.8rem;
		border-bottom: 1px solid #eee;
	}
</style>
