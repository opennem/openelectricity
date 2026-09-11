<script>
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { onMount, tick, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import ComparisonChartSelect from './ComparisonChartSelect.svelte';
	import {
		comparisonMetric,
		comparisonChartId,
		comparisonMetricValue,
		comparisonUnit
	} from './comparison-metrics.js';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import { createResizeControl } from '$lib/components/ui/panel/resize-control.svelte.js';
	import ChartCard from './ChartCard.svelte';
	import { splitTableLabel } from './table-format.js';
	import {
		TABLE_HEADER_CELL,
		TABLE_ROW,
		TABLE_SWATCH,
		TABLE_EMPTY_SWATCH,
		pinnedTableEdge,
		tableValueCell
	} from './table-styles.js';
	import PanelToggle from './PanelToggle.svelte';
	import RegionComparisonChart from './RegionComparisonChart.svelte';
	import { createRegionComparisonData } from './region-comparison-data.svelte.js';
	import { comparisonExportDataset } from './region-comparison-export.js';
	import {
		COMPARISON_REGIONS,
		COMPARISON_INTERVALS,
		normaliseRegionComparison,
		comparisonPeriod,
		clampComparisonViewport,
		latestCommonComparisonPeriod
	} from './region-comparison.js';

	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>, cpi: any}} */
	let { session, cpi } = $props();
	let selection = $derived(normaliseRegionComparison(session.selection.regionComparison));
	let metrics = $derived(selection.charts.map(comparisonMetric));
	const source = createRegionComparisonData(
		() => selection,
		untrack(() => session.clockMs),
		() => cpi
	);
	let chartBounds = $derived.by(() => {
		const times = selection.regions.flatMap((id) =>
			(source.data[id] ?? [])
				.filter((row) =>
					metrics.some((metric) =>
						Number.isFinite(comparisonMetricValue(row, metric.id, selection.basis))
					)
				)
				.map((row) => row.time)
		);
		return {
			start: times.length ? Math.min(...times) : source.bounds.start,
			end: source.bounds.end
		};
	});
	let viewport = $derived(
		clampComparisonViewport(
			selection.start ?? chartBounds.start,
			selection.end ?? chartBounds.end,
			chartBounds
		)
	);
	let hover = $state(/** @type {number | null} */ (null));
	let focus = $state(/** @type {number | null} */ (null));
	let period = $derived(
		hover ??
			focus ??
			latestCommonComparisonPeriod(source.data, selection.regions, selection.basis, viewport)
	);
	let tableScrollLeft = $state(0);
	let panZoomEngaged = $state(false);
	let pinnedEdgeClass = $derived(pinnedTableEdge(tableScrollLeft));
	let panelWidth = $state(38);
	let containerWidth = $state(0);
	const desktop = new MediaQuery('(min-width: 1024px)');
	let panelOpen = $derived(selection.table ?? desktop.current);
	let panelMin = $derived(containerWidth ? Math.min(80, (360 / containerWidth) * 100) : 30);
	let panelMax = $derived(
		desktop.current
			? Math.max(panelMin, Math.min(65, ((containerWidth - 360) / containerWidth) * 100))
			: 94
	);
	let panelSize = $derived(
		desktop.current ? Math.min(panelMax, Math.max(panelMin, panelWidth)) : 94
	);
	/** @type {HTMLButtonElement | undefined} */
	let toggleButton = $state();
	/** @type {HTMLButtonElement | undefined} */
	let closeButton = $state();
	/** @param {Partial<import('./region-comparison.js').RegionComparisonSelection>} change @param {'push'|'replace'|null} [history] */
	function select(change, history = 'push') {
		hover = focus = null;
		session.select('regionComparison', { ...selection, ...change }, history);
	}
	/** @param {boolean} open */
	async function changePanel(open) {
		select({ table: open });
		await tick();
		(open ? closeButton : toggleButton)?.focus();
	}
	const resize = createResizeControl({
		axis: 'x',
		inverted: true,
		step: 2,
		get: () => panelSize,
		set: (value) => {
			panelWidth = value;
		},
		min: () => panelMin,
		max: () => panelMax,
		scale: () => (containerWidth ? 100 / containerWidth : 0),
		commit: () => {
			try {
				localStorage.setItem('tracker-comparison-panel-width', String(panelWidth));
			} catch {
				/* Optional persistence. */
			}
		}
	});
	onMount(() => {
		try {
			const saved = Number(localStorage.getItem('tracker-comparison-panel-width'));
			if (saved > 0) panelWidth = saved;
		} catch {
			/* Optional persistence. */
		}
	});
	/** @param {number} start @param {number} end @param {boolean} settled */
	function moveViewport(start, end, settled) {
		select(clampComparisonViewport(start, end, chartBounds), settled ? 'replace' : null);
	}
	/** @param {string} id @param {boolean} [solo] */
	function toggleRegion(id, solo = false) {
		select({
			regions: solo
				? [id]
				: selection.regions.includes(id)
					? selection.regions.filter((region) => region !== id)
					: [...selection.regions, id]
		});
	}
	const format = (/** @type {number | null} */ value) =>
		Number.isFinite(value)
			? Number(value).toLocaleString('en-AU', { maximumFractionDigits: 1 })
			: '—';
	let caption = $derived(
		`${COMPARISON_INTERVALS.find((i) => i.value === selection.interval)?.label} · % of ${selection.basis === 'demand' ? 'gross demand' : 'generation'}`
	);
	let ready = $derived(
		metrics.length > 0 &&
			!source.pending &&
			selection.regions.some((id) =>
				source.data[id]?.some((row) =>
					metrics.some((metric) =>
						Number.isFinite(comparisonMetricValue(row, metric.id, selection.basis))
					)
				)
			)
	);
	export function exportDataset() {
		return ready ? comparisonExportDataset(source.data, selection, viewport, cpi?.reference) : null;
	}
	export function isLoading() {
		return source.pending;
	}
	export function getControls() {
		return controls;
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && !desktop.current && panelOpen) changePanel(false);
	}}
/>

{#snippet controls()}
	<button
		type="button"
		class="rounded-lg border border-mid-warm-grey px-4 py-2 text-xs font-medium hover:bg-warm-grey"
		onclick={() => select({ start: null, end: null })}>All history</button
	>
	<FilterSelect
		selected={selection.interval}
		options={COMPARISON_INTERVALS}
		listLabel="Comparison interval"
		defaultValue="12mr"
		compact
		onchange={(interval) => select({ interval })}
	/>
	<div>
		<ComparisonChartSelect selected={selection.charts} onchange={(charts) => select({ charts })} />
	</div>
	<FilterSelect
		selected={selection.basis}
		options={[
			{ value: 'demand', label: '% demand' },
			{ value: 'generation', label: '% generation' }
		]}
		listLabel="Percentage basis"
		defaultValue="demand"
		compact
		onchange={(basis) => select({ basis: basis === 'generation' ? 'generation' : 'demand' })}
	/>
{/snippet}

<section
	aria-label="Region comparison"
	class="flex min-h-0 flex-1 flex-col"
	data-png-context={`Compare regions · ${caption}`}
>
	<span class="sr-only" role="status"
		>{source.pending ? 'Loading regional data…' : 'Complete periods · monthly source data'}</span
	>
	<div bind:clientWidth={containerWidth} class="relative flex min-h-0 flex-1 overflow-hidden">
		<!-- The docked panel's drag handle provides the right gutter, as in Timeline. -->
		<div
			class="min-w-0 flex-1 overflow-y-auto py-3 pl-3 sm:py-5 sm:pl-5 {panelOpen && desktop.current
				? ''
				: 'pr-3 sm:pr-5'}"
			use:clickoutside={{ event: 'pointerdown', options: true }}
			onclickoutside={() => (panZoomEngaged = false)}
		>
			{#if !selection.regions.length}<p role="status" class="mb-4 rounded-lg bg-white p-4 text-sm">
					Select a region in the Regions panel to compare.
				</p>{/if}
			{#if selection.regions.length && !source.pending && !selection.regions.some((id) => source.data[id]?.length || source.status[id].error)}<p
					role="status"
					class="mb-4 rounded-lg bg-white p-4 text-sm"
				>
					No completed regional data available for this selection.
				</p>{/if}
			{#each selection.regions.filter((id) => source.status[id].error) as id (id)}
				<div
					role="alert"
					class="mb-3 flex items-center justify-between gap-3 rounded-lg border border-warm-grey bg-white p-4 text-xs"
				>
					<span
						>{COMPARISON_REGIONS.find((r) => r.value === id)?.shortLabel}: {source.status[id]
							.error}</span
					>
					<button
						class="rounded border border-mid-warm-grey px-3 py-2"
						onclick={() => source.retry(id)}
						>Retry {COMPARISON_REGIONS.find((r) => r.value === id)?.shortLabel}</button
					>
				</div>
			{/each}
			{#if !metrics.length}<p role="status" class="mb-4 rounded-lg bg-white p-4 text-sm">
					No charts selected. Use Charts to show comparisons.
				</p>{/if}
			{#each metrics as metric (comparisonChartId(metric.id))}
				{@const cardReady =
					!source.pending &&
					selection.regions.some((id) =>
						source.data[id]?.some((row) =>
							Number.isFinite(comparisonMetricValue(row, metric.id, selection.basis))
						)
					)}
				<ChartCard
					title={metric.label}
					defaultHeightPx={320}
					heightStorageKey={`tracker-comparison-${comparisonChartId(metric.id)}-height`}
					loading={source.pending && !selection.regions.some((id) => source.data[id]?.length)}
					engaged={panZoomEngaged}
					png={{
						id: `regions-${metric.id}`,
						label: metric.label,
						ready: cardReady,
						caption:
							metric.id === 'price_real'
								? `${caption} · ${cpi?.reference ?? 'Unknown CPI reference'} dollars`
								: caption
					}}
				>
					{#snippet actions()}
						{#if metric.fuel && (metric.kind === 'energy' || metric.kind === 'share')}
							<SwitchTabs
								buttons={[
									{ label: 'Proportion', value: comparisonChartId(metric.id) },
									{
										label: 'Generation',
										value: metric.fuel === 'renewables' ? 'generation' : `${metric.fuel}_generation`
									}
								]}
								selected={metric.id}
								onChange={(id) =>
									select({
										charts: selection.charts.map((current) =>
											current === metric.id ? id : current
										)
									})}
							/>
						{/if}
						{#if metric.id === 'price_real'}<span class="text-xs text-mid-grey"
								>{cpi?.reference ? `${cpi.reference} dollars` : 'CPI unavailable'}</span
							>{/if}
					{/snippet}
					{#snippet children(height)}
						<RegionComparisonChart
							data={source.data}
							regions={selection.regions}
							metric={metric.id}
							basis={selection.basis}
							interval={selection.interval}
							{viewport}
							bounds={chartBounds}
							{height}
							bind:engaged={panZoomEngaged}
							{hover}
							{focus}
							onhover={(time) => {
								hover = time;
							}}
							onfocus={(time) => {
								focus = time;
							}}
							onviewport={moveViewport}
						/>
					{/snippet}
				</ChartCard>
			{/each}
			<p class="px-2 text-xs leading-relaxed text-mid-grey">
				Ratios use period totals. Renewable generation excludes storage discharge. Net imports are
				imports minus exports, as a share of gross demand. Market values are weighted by generation.
				Demand shares can exceed 100% in exporting regions. WA covers the WEM. Hover or use the
				arrow keys to inspect a period; press Enter to pin it.
			</p>
			{#if selection.charts.includes('price_real')}<p
					class="px-2 pt-2 text-xs text-mid-grey"
					role="status"
				>
					{cpi?.error ??
						`Inflation adjusted prices use CPI through ${cpi?.reference}. Later periods remain blank until CPI is available.`}
				</p>{/if}
		</div>
		{#if panelOpen}
			{#if desktop.current}
				<DragHandle
					axis="x"
					onstart={resize.start}
					onkeydown={resize.keydown}
					tabindex={0}
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize regions panel"
					aria-valuemin={panelMin}
					aria-valuemax={panelMax}
					aria-valuenow={Math.round(panelSize)}
					active={resize.dragging}
					alwaysShowGrip
					class="w-4"
				/>
			{/if}
			<ResizablePanel
				open
				direction="left"
				defaultSize={panelSize}
				containerSize={containerWidth}
				showDragHandle={false}
				externalResizing={resize.dragging}
				onclose={() => changePanel(false)}
				class={`z-20 flex shrink-0 border-l border-warm-grey bg-white ${desktop.current ? 'relative' : 'absolute inset-y-0 right-0 shadow-xl'}`}
			>
				{#snippet header()}
					<div
						id="tracker-regions-panel"
						class="flex h-[48px] shrink-0 items-center gap-[10px] border-b border-warm-grey px-[4px]"
					>
						<PanelToggle
							side="right"
							open
							label="Hide regions table"
							controls="tracker-regions-panel"
							onclick={() => changePanel(false)}
							bind:el={closeButton}
						/>
						<h3 class="m-0 text-sm font-semibold">Regions</h3>
					</div>
				{/snippet}
				<div class="border-b border-warm-grey px-4 py-3 text-xs text-mid-grey" role="status">
					{period == null
						? 'No common completed period'
						: comparisonPeriod(period, selection.interval)}
					{#if focus != null}<button
							class="ml-2 underline"
							onclick={() => {
								focus = hover = null;
							}}>Clear pinned period</button
						>{/if}
				</div>
				<div class="[--region-w:160px]">
					<div
						onscroll={(event) => (tableScrollLeft = event.currentTarget.scrollLeft)}
						class="overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-pl-(--region-w) scroll-smooth motion-reduce:scroll-auto"
					>
						<table
							style:min-width={`${160 + metrics.length * 100}px`}
							class="w-full table-fixed border-separate border-spacing-0 select-none"
							aria-label="Region comparison values"
						>
							<thead class="bg-light-warm-grey">
								<tr>
									<th
										scope="col"
										class="{pinnedEdgeClass} w-(--region-w) bg-light-warm-grey px-2 text-left text-sm {TABLE_HEADER_CELL}"
									>
										<div class="ml-2 flex flex-col items-start">
											<span class="text-xs text-dark-grey">Region</span>
										</div>
									</th>
									{#each metrics.map( (metric) => ({ label: metric.shortLabel, unit: comparisonUnit(metric.id, selection.basis) }) ) as column, index (index)}
										<th
											scope="col"
											class="w-[100px] snap-start text-right {index === metrics.length - 1
												? 'pr-3 pl-2'
												: 'px-2'} {TABLE_HEADER_CELL}"
										>
											<div class="flex flex-col items-end">
												<span class="text-xs">{column.label}</span>
												<span class="font-mono text-xxs font-light text-mid-grey"
													>{column.unit}</span
												>
											</div>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each COMPARISON_REGIONS as region (region.value)}
									{@const selected = selection.regions.includes(region.value)}
									{@const label = splitTableLabel(region.shortLabel)}
									{@const row = source.data[region.value]?.find((row) => row.time === period)}
									<tr class="{TABLE_ROW} {selected ? '' : 'opacity-50'}">
										<th
											scope="row"
											class="{pinnedEdgeClass} bg-white text-left font-normal group-hover:bg-light-warm-grey"
										>
											<button
												type="button"
												aria-pressed={selected}
												aria-label={`Compare ${region.shortLabel}`}
												title={region.label}
												onclick={(event) =>
													toggleRegion(region.value, event.metaKey || event.ctrlKey)}
												class="flex w-full items-center gap-2.5 py-1.5 pl-4 pr-2 text-left"
											>
												<span
													class={selected ? TABLE_SWATCH : TABLE_EMPTY_SWATCH}
													style:background-color={selected ? region.colour : undefined}
													style:border-color={selected ? region.colour : undefined}
												></span>
												<span class="min-w-0 truncate text-dark-grey"
													>{label.main} <span class="text-mid-grey">{label.sub}</span></span
												>
											</button>
										</th>
										{#each metrics.map((metric) => {
											const value = comparisonMetricValue(row, metric.id, selection.basis);
											return source.status[region.value]?.pending ? '…' : format(value == null ? null : metric.kind === 'energy' ? value / 1000 : value);
										}) as cell, index (index)}
											<td class={tableValueCell(cell, index === metrics.length - 1)}>{cell}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</ResizablePanel>
		{:else}
			<div
				class="z-20 flex w-[48px] shrink-0 flex-col items-center border-l border-warm-grey bg-white pt-[4px]"
			>
				<PanelToggle
					side="right"
					open={false}
					label="Show regions table"
					controls="tracker-regions-panel"
					onclick={() => changePanel(true)}
					bind:el={toggleButton}
				/>
			</div>
		{/if}
	</div>
</section>
