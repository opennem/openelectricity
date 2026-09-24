<script>
	import Toggle from '$lib/components/form-elements/Toggle.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import Stripes from '$lib/icons/Stripes.svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import ComparisonChartSelect from './ComparisonChartSelect.svelte';
	import ComparisonYearNavigator from './ComparisonYearNavigator.svelte';
	import RegionStripes from './RegionStripes.svelte';
	import { stripeGradient, stripeMax, stripeScale } from './comparison-stripes.js';
	import { formatDailyWindow } from './comparison-navigation.js';
	import {
		comparisonMetric,
		comparisonChartId,
		comparisonMetricValue,
		comparisonUnit,
		formatComparisonValue
	} from './comparison-metrics.js';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import { percentPanelBounds } from '$lib/components/ui/panel/panel-bounds.js';
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
	import TrackerPanelHeader from './TrackerPanelHeader.svelte';
	import PanelRail from './PanelRail.svelte';
	import RegionComparisonChart from './RegionComparisonChart.svelte';
	import { CONTRIBUTION_OPTIONS } from './tracker-model.js';
	import { createRegionComparisonData } from './region-comparison-data.svelte.js';
	import { comparisonExportDataset } from './region-comparison-export.js';
	import {
		COMPARISON_REGIONS,
		COMPARISON_INTERVALS,
		normaliseRegionComparison,
		comparisonBoundsFor,
		comparisonDefaultLabel,
		comparisonDefaultViewport,
		comparisonPeriod,
		clampComparisonViewport,
		latestCommonComparisonPeriod
	} from './region-comparison.js';

	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>, cpi: ReturnType<typeof import('$lib/comparison-cpi.js').comparisonCpi>}} */
	let { session, cpi } = $props();
	let selection = $derived(normaliseRegionComparison(session.selection.regionComparison));
	// Every move replaces the selection, whose arrays are rebuilt each time.
	// Deriving them from join-keys keeps their identity stable while their
	// contents are, so a pan frame does not recompute every card and cell.
	let chartsKey = $derived(selection.charts.join(','));
	let regionsKey = $derived(selection.regions.join(','));
	let metrics = $derived(chartsKey ? chartsKey.split(',').map(comparisonMetric) : []);
	let regions = $derived(regionsKey ? regionsKey.split(',') : []);
	// Likewise the strings: a prop written as `selection.basis` tracks the
	// selection itself, so children would re-derive on every move.
	let basis = $derived(selection.basis);
	let interval = $derived(selection.interval);
	const source = createRegionComparisonData(
		() => selection,
		untrack(() => session.clockMs),
		() => cpi,
		() => viewport
	);
	let stripes = $derived(selection.display === 'stripes');
	let daily = $derived(interval === '1d');
	let bounds = $derived(comparisonBoundsFor(source.bounds, interval));
	// Monthly history starts where the displayed metrics first have data. The
	// daily cache only ever holds a few years, so its window slides over the
	// whole data floor instead of the loaded rows.
	let chartBounds = $derived.by(() => {
		if (daily) return bounds;
		const times = regions.flatMap((id) =>
			(source.data[id] ?? [])
				.filter((row) =>
					metrics.some((metric) => Number.isFinite(comparisonMetricValue(row, metric.id, basis)))
				)
				.map((row) => row.time)
		);
		return { start: times.length ? Math.min(...times) : bounds.start, end: bounds.end };
	});
	let defaultViewport = $derived(comparisonDefaultViewport(interval, chartBounds));
	let viewport = $derived(
		clampComparisonViewport(
			selection.start ?? defaultViewport.start,
			selection.end ?? defaultViewport.end,
			chartBounds,
			interval
		)
	);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	/** The visible maximum of a generation metric, for its data-driven ramp;
	 * zero for every other kind, so their memoised scales never change.
	 * @param {{id: string, kind: string}} metric */
	function visibleMax(metric) {
		if (metric.kind !== 'energy') return 0;
		return stripeMax(
			regions.flatMap((region) =>
				(source.data[region] ?? [])
					.filter((row) => row.time >= viewport.start && row.time < viewport.end)
					.map((row) => comparisonMetricValue(row, metric.id, basis))
			)
		);
	}
	let hover = $state(/** @type {number | null} */ (null));
	let focus = $state(/** @type {number | null} */ (null));
	let period = $derived(
		hover ??
			focus ??
			latestCommonComparisonPeriod(
				source.data,
				regions,
				basis,
				viewport,
				metrics.map((metric) => metric.id)
			)
	);
	let tableScrollLeft = $state(0);
	let panZoomEngaged = $state(false);
	let pinnedEdgeClass = $derived(pinnedTableEdge(tableScrollLeft));
	let containerWidth = $state(0);
	const desktop = new MediaQuery('(min-width: 1024px)');
	let panelOpen = $derived(selection.table ?? desktop.current);
	/** @param {Partial<import('./region-comparison.js').RegionComparisonSelection>} change @param {'push'|'replace'|null} [history] */
	function select(change, history = 'push') {
		hover = focus = null;
		session.select('regionComparison', { ...selection, ...change }, history);
	}
	// Regions table: a percentage of the container, remembered locally; small
	// screens overlay it at a fixed width instead.
	const PANEL_MIN_PX = 360;
	let panelBounds = $derived(
		percentPanelBounds({
			containerWidth,
			minPx: PANEL_MIN_PX,
			reservedPx: PANEL_MIN_PX,
			maxPct: 65,
			wide: desktop.current,
			narrowMaxPct: 94
		})
	);
	const panel = createDockedPanel({
		initial: 38,
		min: () => panelBounds.min,
		max: () => panelBounds.max,
		storageKey: 'tracker-comparison-panel-width',
		scale: () => (containerWidth ? 100 / containerWidth : 0),
		inverted: true,
		step: 2,
		setOpen: (open) => select({ table: open })
	});
	let panelSize = $derived(desktop.current ? panel.size : 94);
	/** @param {number} start @param {number} end @param {boolean} settled */
	function moveViewport(start, end, settled) {
		select(clampComparisonViewport(start, end, chartBounds, interval), settled ? 'replace' : null);
		if (settled) source.settle();
	}
	/** @param {string} id @param {boolean} [solo] */
	function toggleRegion(id, solo = false) {
		select({
			regions: solo
				? [id]
				: regions.includes(id)
					? regions.filter((region) => region !== id)
					: [...regions, id]
		});
	}
	let caption = $derived(
		[
			COMPARISON_INTERVALS.find((i) => i.value === interval)?.label,
			daily ? formatDailyWindow(viewport) : null,
			`% of ${basis === 'demand' ? 'gross demand' : 'generation'}`
		]
			.filter(Boolean)
			.join(' · ')
	);
	let ready = $derived(
		metrics.length > 0 &&
			!source.pending &&
			regions.some((id) =>
				source.data[id]?.some((row) =>
					metrics.some((metric) => Number.isFinite(comparisonMetricValue(row, metric.id, basis)))
				)
			)
	);
	export function exportDataset() {
		return ready ? comparisonExportDataset(source.data, selection, viewport, cpi.reference) : null;
	}
	export function getSelection() {
		return selection;
	}
	export function getViewport() {
		return viewport;
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
		if (event.key === 'Escape' && !desktop.current && panelOpen) panel.close();
	}}
/>

{#snippet controls()}
	<SwitchWithIcons
		compact
		rounded="rounded-lg"
		darkSelected
		trackClass="border-mid-warm-grey bg-white"
		aria-label="Comparison display"
		selected={selection.display}
		buttons={[
			{
				value: 'charts',
				icon: ChartLine,
				size: 'size-4',
				ariaLabel: 'Line charts',
				title: 'Line charts'
			},
			{ value: 'stripes', icon: Stripes, size: 'size-4', ariaLabel: 'Stripes', title: 'Stripes' }
		]}
		onchange={({ value }) => select({ display: value === 'stripes' ? 'stripes' : 'charts' })}
	/>
	{#if daily}
		<ComparisonYearNavigator {viewport} {bounds} onmove={(next) => select(next)} />
	{:else}
		<button
			type="button"
			class="rounded-lg border border-mid-warm-grey px-4 py-2 text-xs font-medium hover:bg-warm-grey"
			onclick={() => select({ start: null, end: null })}>{comparisonDefaultLabel(interval)}</button
		>
	{/if}
	<FilterSelect
		selected={interval}
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
		selected={basis}
		options={CONTRIBUTION_OPTIONS}
		listLabel="Percentage basis"
		defaultValue="demand"
		compact
		onchange={(basis) => select({ basis: basis === 'generation' ? 'generation' : 'demand' })}
	/>
{/snippet}

<section
	aria-label="Region comparison"
	class="flex min-h-0 flex-1 flex-col"
	data-png-context={`Compare · ${caption}`}
>
	<span class="sr-only" role="status"
		>{source.pending
			? 'Loading regional data…'
			: `Complete periods · ${daily ? 'daily' : 'monthly'} source data`}</span
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
			{#if !regions.length}<p role="status" class="mb-4 rounded-lg bg-white p-4 text-sm">
					Select a region in the Regions panel to compare.
				</p>{/if}
			{#if regions.length && !source.pending && !regions.some((id) => source.data[id]?.length || source.status[id].error)}<p
					role="status"
					class="mb-4 rounded-lg bg-white p-4 text-sm"
				>
					No completed regional data available for this selection.
				</p>{/if}
			{#each regions.filter((id) => source.status[id].error) as id (id)}
				<div
					role="alert"
					class="mb-3 flex items-center justify-between gap-3 rounded-lg border border-warm-grey bg-white p-4 text-xs"
				>
					<span
						>{COMPARISON_REGIONS.find((r) => r.value === id)?.label}: {source.status[id]
							.error}</span
					>
					<button
						class="rounded border border-mid-warm-grey px-3 py-2"
						onclick={() => source.retry(id)}
						>Retry {COMPARISON_REGIONS.find((r) => r.value === id)?.label}</button
					>
				</div>
			{/each}
			{#if !metrics.length}<p role="status" class="mb-4 rounded-lg bg-white p-4 text-sm">
					No charts selected. Use Charts to show comparisons.
				</p>{/if}
			{#key selection.display}
				<div in:fade={{ duration: reducedMotion.current ? 0 : 160 }}>
					{#each metrics as metric (comparisonChartId(metric.id))}
						{@const cardReady =
							!source.pending &&
							regions.some((id) =>
								source.data[id]?.some((row) =>
									Number.isFinite(comparisonMetricValue(row, metric.id, basis))
								)
							)}
						{@const scale = stripes ? stripeScale(metric.id, basis, visibleMax(metric)) : null}
						<ChartCard
							title={metric.label}
							defaultHeightPx={320}
							heightStorageKey={scale
								? ''
								: `tracker-comparison-${comparisonChartId(metric.id)}-height`}
							loading={source.pending && !regions.some((id) => source.data[id]?.length)}
							engaged={scale ? false : panZoomEngaged}
							png={{
								id: `regions-${metric.id}`,
								label: metric.label,
								ready: cardReady,
								caption:
									metric.id === 'price_real'
										? `${caption} · ${cpi.reference} dollars · ABS CPI`
										: caption
							}}
						>
							{#snippet actions()}
								{#if scale}
									<div
										class="flex items-center gap-2 font-mono text-xxs text-mid-grey"
										role="img"
										aria-label={`Colour scale from ${scale.labels[0]} to ${scale.labels[scale.labels.length - 1]} ${scale.unit}; grey means no data`}
										data-testid="stripes-legend"
									>
										<span>{scale.labels[0]}</span>
										{#if scale.kind === 'swatch'}
											<span class="flex h-2 overflow-hidden rounded-sm">
												{#each scale.colours as colour, index (colour)}
													<span
														class="block h-2 w-3"
														style:background-color={colour}
														title={scale.labels[index]}
													></span>
												{/each}
											</span>
										{:else}
											<span
												class="block h-2 w-24 rounded-sm"
												style:background={stripeGradient(scale)}
											></span>
										{/if}
										<span>{scale.labels[scale.labels.length - 1]}</span>
										<span class="text-mid-warm-grey">{scale.unit}</span>
									</div>
								{/if}
								{#if metric.fuel && (metric.kind === 'energy' || metric.kind === 'share')}
									<SwitchTabs
										buttons={[
											{ label: 'Proportion', value: comparisonChartId(metric.id) },
											{
												label: 'Generation',
												value:
													metric.fuel === 'renewables' ? 'generation' : `${metric.fuel}_generation`
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
								{#if comparisonChartId(metric.id) === 'price_real'}
									<Toggle
										label="Inflation adjusted"
										checked={metric.id === 'price_real'}
										onclick={() =>
											select({
												charts: selection.charts.map((current) =>
													current === metric.id
														? metric.id === 'price_real'
															? 'price'
															: 'price_real'
														: current
												)
											})}
									/>
								{/if}
								{#if metric.id === 'price_real'}
									<span class="text-xs text-mid-grey">{cpi.reference} dollars</span>
								{/if}
							{/snippet}
							{#snippet children(height)}
								{#if scale}
									<RegionStripes
										data={source.data}
										{regions}
										metric={metric.id}
										{basis}
										{interval}
										{viewport}
										bounds={chartBounds}
										{scale}
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
								{:else}
									<RegionComparisonChart
										data={source.data}
										{regions}
										metric={metric.id}
										{basis}
										{interval}
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
								{/if}
							{/snippet}
						</ChartCard>
					{/each}
				</div>
			{/key}
			<p class="px-2 text-xs leading-relaxed text-mid-grey">
				Ratios use period totals. Renewable generation excludes storage discharge. Net imports are
				imports minus exports, as a share of gross demand. Market values are weighted by generation.
				Demand shares can exceed 100% in exporting regions. WA covers the WEM. Hover or use the
				arrow keys to inspect a period; press Enter to pin it.
				{#if stripes}
					Stripes use fixed colour scales so a shade means the same in every region and year;
					generation scales to the visible maximum and grey marks periods without data.
				{/if}
				{#if daily}
					The daily view shows one year at a time: drag or scroll the stripes, click a month, or use
					the year controls to move through history.
				{/if}
			</p>
			{#if selection.charts.includes('price_real')}
				<p class="px-2 pt-2 text-xs text-mid-grey" role="status">
					Inflation adjusted using <a
						href={cpi.source}
						target="_blank"
						rel="noreferrer"
						class="underline">ABS All Groups CPI</a
					>, in {cpi.reference} dollars. Each month uses its quarter’s CPI; later periods remain blank
					until CPI is published.
				</p>
			{/if}
		</div>
		{#if panelOpen}
			{#if desktop.current}
				<DragHandle
					axis="x"
					onstart={panel.start}
					onkeydown={panel.keydown}
					tabindex={0}
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize regions panel"
					aria-valuemin={panelBounds.min}
					aria-valuemax={panelBounds.max}
					aria-valuenow={Math.round(panelSize)}
					active={panel.dragging}
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
				externalResizing={panel.dragging}
				onclose={panel.close}
				class={`z-20 flex shrink-0 border-l border-warm-grey bg-white ${desktop.current ? 'relative' : 'absolute inset-y-0 right-0 shadow-xl'}`}
			>
				{#snippet header()}
					<TrackerPanelHeader
						id="tracker-regions-panel"
						side="right"
						title="Regions"
						label="Hide regions table"
						controls="tracker-regions-panel"
						onclose={panel.close}
						bind:closeButton={panel.closer}
					/>
				{/snippet}
				<div class="border-b border-warm-grey px-4 py-3 text-xs text-mid-grey" role="status">
					{period == null ? 'No common completed period' : comparisonPeriod(period, interval)}
					{#if focus != null}<button
							class="ml-2 underline"
							onclick={() => {
								focus = hover = null;
							}}>Clear pinned period</button
						>{/if}
				</div>
				<div class="[--region-w:240px]">
					<div
						onscroll={(event) => (tableScrollLeft = event.currentTarget.scrollLeft)}
						class="overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-pl-(--region-w) scroll-smooth motion-reduce:scroll-auto"
					>
						<table
							style:min-width={`${240 + metrics.length * 100}px`}
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
									{#each metrics.map( (metric) => ({ label: metric.shortLabel, unit: comparisonUnit(metric.id, basis) }) ) as column, index (index)}
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
									{@const selected = regions.includes(region.value)}
									{@const label = splitTableLabel(region.label)}
									{@const row = source.data[region.value]?.find((row) => row.time === period)}
									<tr class="{TABLE_ROW} {selected ? '' : 'opacity-50'}">
										<th
											scope="row"
											class="{pinnedEdgeClass} bg-white text-left font-normal group-hover:bg-light-warm-grey"
										>
											<button
												type="button"
												aria-pressed={selected}
												aria-label={`Compare ${region.label}`}
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
											const value = comparisonMetricValue(row, metric.id, basis);
											return source.status[region.value]?.pending && !row ? '…' : formatComparisonValue(value, metric.id);
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
			<PanelRail
				side="right"
				label="Show regions table"
				controls="tracker-regions-panel"
				onopen={panel.open}
				bind:opener={panel.opener}
			/>
		{/if}
	</div>
</section>
