<script>
	import Toggle from '$lib/components/form-elements/Toggle.svelte';
	import Select from '$lib/components/form-elements/Select.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import { untrack } from 'svelte';
	import { bisectLeft } from 'd3-array';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import IntervalControls from '$lib/components/charts/v2/IntervalControls.svelte';
	import ComparisonChartSelect from './ComparisonChartSelect.svelte';
	import RegionStripes from './RegionStripes.svelte';
	import { stripeMax, stripeScale } from './comparison-stripes.js';
	import StripeLegend from './StripeLegend.svelte';
	import {
		comparisonMetric,
		comparisonChartId,
		comparisonPresentation,
		comparisonPresentations,
		comparisonMetricValue,
		comparisonTableColumn,
		formatComparisonCell
	} from './comparison-metrics.js';
	import ChartCard from './ChartCard.svelte';
	import { splitTableLabel } from './table-format.js';
	import {
		TABLE_HEADER_BUTTON,
		TABLE_HEADER_CELL,
		TABLE_ROW,
		TABLE_SWATCH,
		TABLE_EMPTY_SWATCH,
		focusEdges,
		pinnedTableEdge,
		scrollColumnsIntoView,
		columnFocusFor,
		valueCellClass,
		valueCellEdges,
		valueHeaderClass,
		valueHeaderEdges
	} from './table-styles.js';
	import TrackerPanelHeader from './TrackerPanelHeader.svelte';
	import TableOptions from './TableOptions.svelte';
	import TableFootnotes from './TableFootnotes.svelte';
	import TrackerSplitLayout from './TrackerSplitLayout.svelte';
	import RegionComparisonChart from './RegionComparisonChart.svelte';
	import { CONTRIBUTION_OPTIONS, RENEWABLES_DOCS, contributionLabel } from './tracker-model.js';
	import { createRegionComparisonData } from './region-comparison-data.svelte.js';
	import { comparisonExportDataset } from './region-comparison-export.js';
	import {
		COMPARISON_REGIONS,
		COMPARISON_INTERVAL_IDS,
		comparisonFilterLabel,
		periodMonths,
		normaliseRegionComparison,
		COMPARISON_DISPLAYS,
		comparisonPeriod,
		comparisonRangeLabel,
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
	let filter = $derived(selection.filter);
	let months = $derived(periodMonths(interval, filter));
	const source = createRegionComparisonData(
		() => selection,
		untrack(() => session.clockMs),
		() => cpi
	);
	let stripes = $derived(selection.display === 'stripes');
	/** The periods, ascending, where some selected region has a value for a
	 * displayed metric. History starts at the first (the window opens on all of
	 * it), exports need one, and the readout names the first and last on
	 * screen, found by bisection rather than a scan on every pan frame. */
	let valueTimes = $derived.by(() => {
		const times = new Set();
		for (const id of regions)
			for (const row of source.data[id] ?? [])
				if (metrics.some((metric) => Number.isFinite(comparisonMetricValue(row, metric.id, basis))))
					times.add(row.time);
		return /** @type {number[]} */ ([...times]).sort((a, b) => a - b);
	});
	let chartBounds = $derived({
		start: valueTimes[0] ?? source.bounds.start,
		end: source.bounds.end
	});
	let viewport = $derived(
		clampComparisonViewport(
			selection.start ?? chartBounds.start,
			selection.end ?? chartBounds.end,
			chartBounds
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
	/** What the pointer is over, mirrored in the Regions table as in Profile's
	 * breakdown: the hovered card's metric outlines its column, the region
	 * under the pointer (a line, or a heatmap row) outlines its row, and the
	 * cell where they meet reads white on OE red. */
	let hoverMetric = $state(/** @type {string | null} */ (null));
	let hoverRegion = $state(/** @type {string | null} */ (null));
	/** @param {string} id @param {boolean} hovered */
	function hoverCard(id, hovered) {
		if (hovered) hoverMetric = id;
		else if (hoverMetric === id) hoverMetric = null;
	}
	/** Each metric column's place in the focus: the hovered card's column. */
	let columnFocus = $derived(
		columnFocusFor(
			metrics.map((metric) => metric.id),
			hoverMetric ? [hoverMetric] : []
		)
	);
	const LAST_REGION = COMPARISON_REGIONS[COMPARISON_REGIONS.length - 1].value;
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
	/** Header-chosen units for the Regions table's generation and intensity columns. */
	let tableUnits = $state.raw(/** @type {import('./table-units.js').TableUnits} */ ({}));
	let tableScrollLeft = $state(0);
	let tableScroller = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
	// Bring the hovered chart's column into view beside the pinned Region
	// column, as Profile's breakdown does: a DOM side effect, so an effect.
	$effect(() => {
		if (tableScroller) scrollColumnsIntoView(tableScroller, hoverMetric ? [hoverMetric] : []);
	});
	let panZoomEngaged = $state(false);
	let pinnedEdgeClass = $derived(pinnedTableEdge(tableScrollLeft));
	const desktop = new MediaQuery('(min-width: 1024px)');
	let panelOpen = $derived(selection.table ?? desktop.current);
	// The Regions table is the readout beside the charts. While it is closed,
	// or overlays them below desktop, the charts carry their own tooltips.
	let tooltip = $derived(!desktop.current || !panelOpen);
	/** @param {Partial<import('./region-comparison.js').RegionComparisonSelection>} change @param {'push'|'replace'|null} [history] */
	function select(change, history = 'push') {
		hover = focus = null;
		session.select('regionComparison', { ...selection, ...change }, history);
	}
	// Regions table: a percentage of the container, remembered locally; small
	// screens overlay it instead.
	/** @type {import('./types.js').TrackerSplitConfig} */
	const REGIONS_SPLIT = {
		initial: 38,
		minPx: 360,
		reservedPx: 360,
		maxPct: 65,
		narrowMaxPct: 94,
		storageKey: 'tracker-comparison-panel-width',
		narrowOverlay: true
	};
	/** @param {number} start @param {number} end @param {boolean} settled */
	function moveViewport(start, end, settled) {
		select(clampComparisonViewport(start, end, chartBounds), settled ? 'replace' : null);
	}
	/** Switch a chart's presentation in place (proportion or generation,
	 * official or excluding batteries, nominal or inflation adjusted).
	 * @param {string} from @param {string} to */
	function swapChart(from, to) {
		select({ charts: selection.charts.map((current) => (current === from ? to : current)) });
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
			getIntervalSpec(interval)?.label,
			comparisonFilterLabel(interval, filter),
			`% of ${basis === 'demand' ? 'gross demand' : 'generation'}`
		]
			.filter(Boolean)
			.join(' · ')
	);
	let ready = $derived(!source.pending && valueTimes.length > 0);
	/** Whether any selected region has a value to export. */
	export function canExport() {
		return ready;
	}
	export function exportDataset() {
		return ready ? comparisonExportDataset(source.data, selection, viewport, cpi.reference) : null;
	}
	export function getSelection() {
		return selection;
	}
	export function getViewport() {
		return viewport;
	}
	export function getControls() {
		return controls;
	}
	/** The first and last period on screen with a displayed value: only
	 * complete periods are shown, so an unfinished year inside the viewport is
	 * not one. */
	let shownPeriods = $derived.by(() => {
		const from = bisectLeft(valueTimes, viewport.start);
		const to = bisectLeft(valueTimes, viewport.end) - 1;
		return from <= to
			? { first: valueTimes[from], last: valueTimes[to] }
			: { first: null, last: null };
	});
	/** The visible periods, for the top-nav readout. */
	export function getRangeLabel() {
		return comparisonRangeLabel(shownPeriods.first, shownPeriods.last, interval);
	}
	/** The hovered or pinned period, replacing the range readout while it lasts. */
	export function getInspectLabel() {
		const inspected = hover ?? focus;
		return inspected == null ? undefined : comparisonPeriod(inspected, interval);
	}
	export function isLoading() {
		return source.pending;
	}
</script>

{#snippet columnHeading(/** @type {string} */ label, /** @type {string} */ unit)}
	<span class="text-xs">{label}</span>
	<span class="font-mono text-xxs font-light text-mid-grey">{unit}</span>
{/snippet}

{#snippet controls()}
	<Switch
		buttons={COMPARISON_DISPLAYS}
		selected={selection.display}
		compact
		rounded="rounded-lg"
		darkSelected
		aria-label="Comparison display"
		onchange={(option) => select({ display: option.value === 'stripes' ? 'stripes' : 'charts' })}
	/>
	<div>
		<ComparisonChartSelect selected={selection.charts} onchange={(charts) => select({ charts })} />
	</div>
	<!-- Timeline's interval pill, 12-month rolling switch and calendar-period
	     filter; a filter the new grain cannot keep is dropped. -->
	<IntervalControls
		options={COMPARISON_INTERVAL_IDS}
		displayInterval={interval}
		showBucketFilter
		bucketFilter={filter}
		onintervalchange={(interval) => select({ interval })}
		onbucketfilterchange={(filter) => select({ filter })}
	/>
{/snippet}

<!-- The percentage basis lives with the table, as in Timeline and Profile:
     its options dialog, the collapsed rail and the proportion headers. -->
{#snippet tableOptions()}
	<TableOptions title="Regions table options" summary={contributionLabel(basis)}>
		<Select
			formLabel="Contribution %"
			options={CONTRIBUTION_OPTIONS}
			selected={basis}
			staticDisplay
			paddingX=""
			onchange={(option) =>
				select({ basis: option.value === 'generation' ? 'generation' : 'demand' })}
		/>
	</TableOptions>
{/snippet}

<section
	aria-label="Region comparison"
	class="flex min-h-0 flex-1 flex-col"
	data-png-context={`Compare · ${caption}`}
>
	<span class="sr-only" role="status"
		>{source.pending ? 'Loading regional data…' : 'Complete periods · monthly source data'}</span
	>
	<TrackerSplitLayout
		config={REGIONS_SPLIT}
		open={panelOpen}
		onopenchange={(table) => select({ table })}
		controls="tracker-regions-panel"
		resizeLabel="Resize regions panel"
		railLabel="Show regions table"
		bind:engaged={panZoomEngaged}
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
					>{COMPARISON_REGIONS.find((r) => r.value === id)?.label}: {source.status[id].error}</span
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
						highlighted={hoverMetric === metric.id}
						onhover={(hovered) => hoverCard(metric.id, hovered)}
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
								<StripeLegend {scale} metric={metric.id} />
							{/if}
							<!-- Each presentation axis the chart varies along: proportion or
							     generation, official or excluding batteries, nominal or real. -->
							{#each comparisonPresentations(metric.chart) as axis (axis.key)}
								{#if axis.control === 'tabs'}
									<SwitchTabs
										buttons={axis.labels.map((label, index) => ({
											label,
											value: comparisonPresentation(metric.id, axis.key, index === 1)
										}))}
										selected={metric.id}
										onChange={(id) => swapChart(metric.id, id)}
									/>
								{:else}
									<Toggle
										label={axis.label}
										checked={!!metric[axis.key] !== !!axis.checkedWhenOff}
										onclick={() =>
											swapChart(
												metric.id,
												comparisonPresentation(metric.id, axis.key, !metric[axis.key])
											)}
									/>
								{/if}
							{/each}
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
									{months}
									{viewport}
									bounds={chartBounds}
									{scale}
									{tooltip}
									onhoverregion={(region) => (hoverRegion = region)}
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
									{months}
									{viewport}
									bounds={chartBounds}
									{height}
									{tooltip}
									{hoverRegion}
									onhoverregion={(region) => (hoverRegion = region)}
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

		{#snippet panelHeader(/** @type {import('./types.js').TrackerDock} */ dock)}
			<TrackerPanelHeader
				id="tracker-regions-panel"
				side="right"
				title="Regions"
				label="Hide regions table"
				controls="tracker-regions-panel"
				onclose={dock.close}
				bind:closeButton={dock.closer}
			>
				{@render tableOptions()}
			</TrackerPanelHeader>
		{/snippet}
		{#snippet rail()}{@render tableOptions()}{/snippet}
		{#snippet panel()}
			<div class="[--region-w:240px]">
				<div
					bind:this={tableScroller}
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
								{#each metrics as metric, index (index)}
									{@const column = comparisonTableColumn(metric.id, basis, tableUnits)}
									{@const change = column.change}
									<th
										scope="col"
										data-column={metric.id}
										data-focused={columnFocus[index].focused || undefined}
										class={valueHeaderClass(
											index === metrics.length - 1,
											columnFocus[index].focused
										)}
										style:box-shadow={valueHeaderEdges(columnFocus[index])}
									>
										{#if change}
											<button
												type="button"
												onclick={() => {
													if ('units' in change) tableUnits = change.units;
													else select({ basis: change.basis });
												}}
												title={`Show ${column.nextUnit}`}
												class="{TABLE_HEADER_BUTTON} -mr-1.5 flex-col items-end"
											>
												{@render columnHeading(metric.shortLabel, column.unit)}
											</button>
										{:else}
											<div class="flex flex-col items-end">
												{@render columnHeading(metric.shortLabel, column.unit)}
											</div>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each COMPARISON_REGIONS as region (region.value)}
								{@const selected = regions.includes(region.value)}
								{@const label = splitTableLabel(region.label)}
								{@const row = source.data[region.value]?.find((row) => row.time === period)}
								{@const focused = region.value === hoverRegion}
								<tr
									data-focused={focused || undefined}
									class="{TABLE_ROW} {selected ? '' : 'opacity-50'} {focused
										? 'bg-light-warm-grey'
										: ''}"
								>
									<th
										scope="row"
										class="{pinnedEdgeClass} {focused
											? 'bg-light-warm-grey'
											: 'bg-white group-hover:bg-light-warm-grey'} text-left font-normal"
										style:box-shadow={focusEdges({
											top: focused,
											bottom: focused,
											left: focused,
											right: focused && !metrics.length
										})}
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
										return source.status[region.value]?.pending && !row ? '…' : formatComparisonCell(value, metric.id, tableUnits);
									}) as cell, index (index)}
										{@const last = index === metrics.length - 1}
										<td
											class={valueCellClass(cell, last, 'py-1.5', focused, columnFocus[index])}
											style:box-shadow={valueCellEdges(focused, columnFocus[index], {
												last,
												lastRow: region.value === LAST_REGION
											})}>{cell}</td
										>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<TableFootnotes>
					<li>Ratios use period totals; market values are weighted by generation.</li>
					{#if metrics.some((metric) => metric.fuel === 'renewables' && !metric.exBatteries)}
						<li>
							<a href={RENEWABLES_DOCS.href} target="_blank" rel="noreferrer" class="underline"
								>{RENEWABLES_DOCS.label}</a
							>
						</li>
					{/if}
					{#if metrics.some((metric) => metric.exBatteries)}
						<li>
							Renewables excl. batteries sum solar, wind, hydro and bioenergy, without battery
							discharge or pumping; hydro includes pumped-hydro output.
						</li>
					{/if}
					<li>
						Net imports are imports minus exports, as a share of gross demand. Demand shares can
						exceed 100% in exporting regions.
					</li>
					{#if stripes}
						<li>
							The heatmap uses fixed colour scales so a shade means the same in every region and
							year; generation scales to the visible maximum and grey marks periods without data.
						</li>
					{/if}
					{#if selection.charts.includes('price_real')}
						<li>
							Inflation adjusted using <a
								href={cpi.source}
								target="_blank"
								rel="noreferrer"
								class="underline">ABS All Groups CPI</a
							>, in {cpi.reference} dollars. Each month uses its quarter’s CPI; later periods remain blank
							until CPI is published.
						</li>
					{/if}
				</TableFootnotes>
			</div>
		{/snippet}
	</TrackerSplitLayout>
</section>
