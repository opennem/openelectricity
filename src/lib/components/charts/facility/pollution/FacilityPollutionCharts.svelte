<script>
	import { ChevronRight, ExternalLink } from '@lucide/svelte';
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { Sheet } from '$lib/components/ui/sheet';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import { CATEGORY_META } from './pollution-constants.js';
	import { formatPollutantMass, formatPollutantMassParts } from './format-pollutant-mass.js';
	import { computePollutantTrend } from './pollutant-trend.js';
	import Sparkline from './Sparkline.svelte';

	/**
	 * Row-based pollution tables for /facility/[code]. Each NPI category
	 * (Air / Water / Heavy Metals / Organics) renders as its own table inside
	 * a responsive grid — two columns on desktop, one on mobile. Rows show
	 * pollutant name, sparkline, latest-FY value, and a trend indicator
	 * comparing the latest value to the prior 5-year average. The category
	 * title is a button that slides a side-sheet open with two tabbed views:
	 * one chart per pollutant (using the shared MiniCharts component) and a
	 * year-by-year data grid. Hover state is synced across every chart in
	 * the sheet.
	 *
	 * @type {{
	 *   data: import('./transform-pollution.js').PollutionData,
	 *   npiHref?: string | null
	 * }}
	 */
	let { data, npiHref = null } = $props();

	let categoryOrder = $derived(
		Object.keys(CATEGORY_META).filter((key) => data.byCategory[key]?.length)
	);

	let latestYear = $derived(data.years[data.years.length - 1] ?? '');
	let startYear = $derived(data.years[0] ?? '');

	/** @type {string | null} */
	let openCategory = $state(null);

	/** @type {'chart' | 'data'} */
	let sheetView = $state('chart');

	// Shared hover/focus times for the in-sheet MiniCharts so a hover on any
	// pollutant card syncs the indicator + active value across every other
	// pollutant card.
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	/** @type {number | undefined} */
	let focusTime = $state(undefined);

	/** @param {number} time */
	function handleHover(time) {
		hoverTime = time;
	}
	function handleHoverEnd() {
		hoverTime = undefined;
	}
	/** @param {number} time */
	function handleFocus(time) {
		focusTime = focusTime === time ? undefined : time;
	}

	$effect(() => {
		// Reset hover/focus when the sheet closes or switches category.
		const _cat = openCategory;
		hoverTime = undefined;
		focusTime = undefined;
	});

	/**
	 * Format a calendar-year start (e.g. "2023") as Australian fiscal year — the
	 * row covers FY23/24, which we display as `FY24`.
	 * @param {string | number | Date} value
	 */
	function fiscalYearLabel(value) {
		const startYear =
			value instanceof Date ? value.getUTCFullYear() : parseInt(String(value).slice(0, 4), 10);
		if (Number.isNaN(startYear)) return '';
		const fyEnd = (startYear + 1) % 100;
		return `FY${String(fyEnd).padStart(2, '0')}`;
	}

	/**
	 * @param {number} delta
	 */
	function formatDelta(delta) {
		const pct = Math.abs(delta) * 100;
		return `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%`;
	}

	let sheetMeta = $derived(openCategory ? CATEGORY_META[openCategory] : null);

	let sheetPollutants = $derived.by(() => {
		if (!openCategory) return [];
		const list = data.byCategory[openCategory] ?? [];
		return list.filter((p) => Object.values(p.values).some((v) => v != null));
	});

	/**
	 * Build the per-fiscal-year row data shape MiniCharts wants. Each row
	 * carries every active pollutant in the open category at the same time
	 * key so the per-chart stores all read the same x-axis.
	 */
	let sheetSeriesData = $derived.by(
		/** @returns {import('$lib/components/charts/v2/types.js').TimeSeriesData[]} */
		() => {
			if (!sheetPollutants.length) return [];
			return data.years.map((year) => {
				const startYear = parseInt(String(year).slice(0, 4), 10);
				const time = Date.UTC(startYear, 6, 1);
				/** @type {Record<string, any>} */
				const row = { time, date: new Date(time) };
				for (const p of sheetPollutants) row[p.code] = p.values[year] ?? null;
				return /** @type {any} */ (row);
			});
		}
	);

	// Sparkline colour is shared across every category — use the air-pollutant
	// hue as a single accent so the visual emphasis stays on shape and trend
	// rather than varied palettes per group.
	const SPARKLINE_COLOUR = CATEGORY_META.air_pollutant.colour;
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
	{#each categoryOrder as catKey (catKey)}
		{@const catMeta = CATEGORY_META[catKey]}
		{@const pollutants = data.byCategory[catKey]}

		<section>
			<header class="border-b border-dark-grey">
				<button
					type="button"
					onclick={() => (openCategory = catKey)}
					class="group flex items-center justify-between w-full py-2 text-xs font-medium text-mid-grey hover:text-dark-grey cursor-pointer transition-colors"
				>
					<span>{catMeta.label}</span>
					<span class="inline-flex items-center gap-0.5 group-hover:text-dark-grey">
						View charts
						<ChevronRight size={12} />
					</span>
				</button>
			</header>

			<table class="w-full text-xs border-collapse table-fixed">
				<colgroup>
					<col />
					<col class="w-[80px]" />
					<col class="w-[80px]" />
					<col class="w-[64px]" />
				</colgroup>
				<thead>
					<tr class="bg-dark-grey text-[10px] font-medium uppercase tracking-wider text-white">
						<th scope="col" class="py-2 pl-3 text-left">Pollutant</th>
						<th scope="col" colspan="2" class="py-2 text-center whitespace-nowrap">
							{#if startYear && latestYear}
								{fiscalYearLabel(startYear)} — {fiscalYearLabel(latestYear)}
							{:else if latestYear}
								{fiscalYearLabel(latestYear)}
							{:else}
								Latest
							{/if}
						</th>
						<th scope="col" class="py-2 pr-3 text-right whitespace-nowrap">vs 5y avg</th>
					</tr>
				</thead>
				<tbody>
					{#each pollutants as pollutant (pollutant.code)}
						{@const yearValues = data.years.map((y) => pollutant.values[y] ?? null)}
						{@const latest = pollutant.values[latestYear] ?? null}
						{@const latestParts = formatPollutantMassParts(latest)}
						{@const trend = computePollutantTrend(yearValues)}

						<tr class="border-b border-warm-grey/40 align-middle">
							<th
								scope="row"
								class="py-2 pl-3 text-left font-medium text-dark-grey truncate"
								title={pollutant.label}
							>
								{pollutant.label}
							</th>
							<td class="py-2">
								<div class="flex justify-end">
									<Sparkline
										values={yearValues}
										colour={SPARKLINE_COLOUR}
										ariaLabel="Trend for {pollutant.label}"
									/>
								</div>
							</td>
							<td
								class="py-2 pl-3 text-left font-mono tabular-nums text-dark-grey whitespace-nowrap"
							>
								{latestParts.value}{#if latestParts.unit}<span
										class="ml-1 text-[10px] font-normal text-mid-grey">{latestParts.unit}</span
									>{/if}
							</td>
							<td class="py-2 pr-3 text-right font-mono tabular-nums whitespace-nowrap">
								{#if trend === null}
									<span class="text-mid-grey">—</span>
								{:else if trend.direction === 'up'}
									<span
										class="inline-flex items-center justify-end gap-1 text-red"
										aria-label="Up {formatDelta(trend.delta)} vs 5-year average"
									>
										<span aria-hidden="true" class="text-[9px] leading-none">▲</span>
										{formatDelta(trend.delta)}
									</span>
								{:else if trend.direction === 'down'}
									<span
										class="inline-flex items-center justify-end gap-1 text-success-green"
										aria-label="Down {formatDelta(trend.delta)} vs 5-year average"
									>
										<span aria-hidden="true" class="text-[9px] leading-none">▼</span>
										{formatDelta(trend.delta)}
									</span>
								{:else}
									<span class="text-mid-grey" aria-label="Flat vs 5-year average">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/each}
</div>

<Sheet
	open={openCategory !== null}
	title={sheetMeta?.label ?? ''}
	side="right"
	width="min(640px, 100vw)"
	align="stretch"
	rounded={false}
	backdrop
	onclose={() => (openCategory = null)}
>
	{#if sheetMeta && sheetPollutants.length}
		<div class="px-6 pt-4 pb-2 flex justify-end">
			<SwitchTabs
				buttons={[
					{ label: 'Charts', value: 'chart' },
					{ label: 'Data', value: 'data' }
				]}
				selected={sheetView}
				onChange={(v) => (sheetView = /** @type {'chart' | 'data'} */ (v))}
			/>
		</div>

		{#if sheetView === 'chart'}
			<div class="px-6 py-2">
				{#each sheetPollutants as pollutant (pollutant.code)}
					{@const yearValues = data.years.map((y) => pollutant.values[y] ?? null)}
					{@const trend = computePollutantTrend(yearValues)}

					<section
						class="grid grid-cols-[1fr_96px] gap-4 items-center border-t border-warm-grey first:border-t-0 py-3 first:pt-0"
					>
						<div class="min-w-0">
							<MiniCharts
								gridColClass="grid-cols-1"
								gridGapClass="gap-0"
								sectionPaddingClass="p-0"
								sectionBorderClass="border-0"
								chartHeightClass="h-[90px]"
								reverseOrder={false}
								showMaxReferenceLine
								tooltipMode="compact-card"
								tooltipCardAlign="right"
								showCardSummary={false}
								displayUnit=""
								seriesNames={[pollutant.code]}
								seriesLabels={{ [pollutant.code]: pollutant.label }}
								seriesColours={{ [pollutant.code]: SPARKLINE_COLOUR }}
								seriesData={sheetSeriesData}
								{hoverTime}
								{focusTime}
								formatTickX={fiscalYearLabel}
								formatTickY={formatPollutantMass}
								onhover={handleHover}
								onhoverend={handleHoverEnd}
								onfocus={handleFocus}
							/>
						</div>
						<div class="text-right text-xs">
							{#if trend === null}
								<span class="text-mid-grey">—</span>
							{:else if trend.direction === 'up'}
								<div
									class="inline-flex items-center justify-end gap-1 text-red font-mono tabular-nums text-xl font-semibold"
									aria-label="Up {formatDelta(trend.delta)} vs 5-year average"
								>
									<span aria-hidden="true" class="text-sm leading-none">▲</span>
									{formatDelta(trend.delta)}
								</div>
								<div class="text-[10px] text-mid-grey mt-0.5">vs 5y avg</div>
							{:else if trend.direction === 'down'}
								<div
									class="inline-flex items-center justify-end gap-1 text-success-green font-mono tabular-nums text-xl font-semibold"
									aria-label="Down {formatDelta(trend.delta)} vs 5-year average"
								>
									<span aria-hidden="true" class="text-sm leading-none">▼</span>
									{formatDelta(trend.delta)}
								</div>
								<div class="text-[10px] text-mid-grey mt-0.5">vs 5y avg</div>
							{:else}
								<span class="text-mid-grey" aria-label="Flat vs 5-year average">—</span>
							{/if}
						</div>
					</section>
				{/each}
			</div>
		{:else}
			<div class="px-6 py-2 overflow-x-auto">
				<table class="w-full text-xs border-collapse">
					<thead>
						<tr class="text-[10px] font-medium text-mid-grey uppercase tracking-wider">
							<th scope="col" class="sticky left-0 bg-white py-2 pr-3 text-left whitespace-nowrap">
								Pollutant
							</th>
							{#each data.years as year (year)}
								<th
									scope="col"
									class="py-2 px-2 text-right whitespace-nowrap font-mono tabular-nums"
								>
									{fiscalYearLabel(year)}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each sheetPollutants as pollutant (pollutant.code)}
							<tr class="border-t border-warm-grey/40">
								<th
									scope="row"
									class="sticky left-0 bg-white py-2 pr-3 text-left font-medium text-dark-grey"
								>
									{pollutant.label}
								</th>
								{#each data.years as year (year)}
									{@const v = pollutant.values[year] ?? null}
									<td
										class="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap {v == null
											? 'text-mid-grey'
											: 'text-dark-grey'}"
									>
										{formatPollutantMass(v)}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	{#snippet footer()}
		<div class="text-xs text-mid-grey">
			Source:
			{#if npiHref}
				<a
					href={npiHref}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-black underline hover:opacity-70"
				>
					National Pollutant Inventory
					<ExternalLink size={11} />
				</a>
			{:else}
				National Pollutant Inventory
			{/if}
		</div>
	{/snippet}
</Sheet>
