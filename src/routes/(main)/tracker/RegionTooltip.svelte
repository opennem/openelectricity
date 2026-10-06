<script>
	import { formatComparisonCell } from './comparison-metrics.js';
	import { COMPARISON_REGIONS } from './region-comparison.js';

	/**
	 * The floating tooltip of Compare's custom displays (heatmap, panels):
	 * the period and unit over one row per region, the hovered region
	 * emphasised. Styled as Stratum's floating tooltip. It sits beside
	 * `anchor`, flipping left or up to stay inside the `width` × `height`
	 * container it is absolutely positioned in.
	 * @type {{period: string, unit: string, regions: string[], row: Record<string, any> | undefined,
	 *   metric: string, hovered: string | null, anchor: {x: number, y: number},
	 *   width: number, height: number}} */
	let { period, unit, regions, row, metric, hovered, anchor, width, height } = $props();

	let ownWidth = $state(0);
	let ownHeight = $state(0);
	let style = $derived.by(() => {
		let left = anchor.x + 12;
		if (left + ownWidth > width) left = Math.max(0, anchor.x - 12 - ownWidth);
		let top = anchor.y + 12;
		if (top + ownHeight > height) top = Math.max(0, anchor.y - 12 - ownHeight);
		return `left: ${left}px; top: ${top}px;`;
	});
	let rows = $derived(
		regions.map((id) => {
			const region = COMPARISON_REGIONS.find((r) => r.value === id);
			return {
				id,
				label: region?.shortLabel ?? id,
				colour: region?.colour ?? '#333333',
				value: formatComparisonCell(row?.[id], metric, {}),
				hovered: id === hovered
			};
		})
	);
</script>

<div
	class="pointer-events-none absolute z-20 flex min-w-[160px] flex-col rounded-md border border-warm-grey bg-white/70 px-3 py-2 text-xs whitespace-nowrap shadow-sm backdrop-blur-md backdrop-saturate-150"
	{style}
	bind:clientWidth={ownWidth}
	bind:clientHeight={ownHeight}
	data-testid="chart-floating-tooltip"
>
	<div
		class="mb-1.5 flex items-baseline justify-between gap-3 border-b border-warm-grey/60 pb-1.5 font-light text-mid-grey"
	>
		<span>{period}</span>
		<span class="text-right font-mono">{unit}</span>
	</div>
	<div class="flex flex-col gap-1">
		{#each rows as entry (entry.id)}
			<div
				class="flex items-center justify-between gap-3 rounded-sm {entry.hovered
					? 'bg-warm-grey/60'
					: ''}"
			>
				<span class="flex min-w-0 items-center gap-1.5">
					<span class="size-2 shrink-0 rounded-full" style:background-color={entry.colour}></span>
					<span class="truncate {entry.hovered ? 'font-semibold text-black' : 'text-dark-grey'}"
						>{entry.label}</span
					>
				</span>
				<span
					class="text-right font-mono tabular-nums {entry.hovered
						? 'font-semibold text-black'
						: 'font-medium text-dark-grey'}">{entry.value}</span
				>
			</div>
		{/each}
	</div>
</div>
