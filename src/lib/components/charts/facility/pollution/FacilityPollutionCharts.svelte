<script>
	import { ChevronRight } from '@lucide/svelte';
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { Sheet } from '$lib/components/ui/sheet';
	import { CATEGORY_META } from './pollution-constants.js';
	import { formatPollutantMass } from './format-pollutant-mass.js';
	import { computePollutantTrend } from './pollutant-trend.js';
	import { buildCategoryMeta } from './transform-pollution.js';
	import Sparkline from './Sparkline.svelte';

	/**
	 * Row-based pollution table for /facility/[code]. Each row is a pollutant —
	 * name, sparkline across all reported years, latest-FY value, and a
	 * trend indicator comparing the latest value to the prior 5-year average.
	 *
	 * Pollutants are grouped by NPI category (Air / Water / Heavy Metals /
	 * Organics) — each category renders as its own `<tbody>` block with a
	 * clickable heading row that slides a side-sheet open showing the full
	 * small-multiples chart grid for that category.
	 *
	 * @type {{ data: import('./transform-pollution.js').PollutionData }}
	 */
	let { data } = $props();

	let categoryOrder = $derived(
		Object.keys(CATEGORY_META).filter((key) => data.byCategory[key]?.length)
	);

	let latestYear = $derived(data.years[data.years.length - 1] ?? '');

	/** @type {string | null} */
	let openCategory = $state(null);

	/**
	 * Format a calendar-year start (e.g. "2023") as Australian fiscal year — the
	 * row covers FY23/24, which we display as `FY24`.
	 * @param {string} year
	 */
	function fiscalYearLabel(year) {
		const startYear = parseInt(year, 10);
		if (Number.isNaN(startYear)) return '';
		const fyEnd = (startYear + 1) % 100;
		return `FY${String(fyEnd).padStart(2, '0')}`;
	}

	/**
	 * @param {Date | number | string} value
	 */
	function fiscalYearLabelFromAny(value) {
		const startYear =
			value instanceof Date
				? value.getUTCFullYear()
				: parseInt(String(value).slice(0, 4), 10);
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

	/**
	 * Reshape a single category's pollutants into the prop bundle MiniCharts
	 * expects. Each row in `seriesData` is one fiscal year, with one column per
	 * pollutant. Mirrors the original small-multiples implementation.
	 *
	 * @param {string} catKey
	 */
	function buildCategoryProps(catKey) {
		const pollutants = data.byCategory[catKey] ?? [];
		const active = pollutants.filter((p) =>
			Object.values(p.values).some((v) => v != null)
		);
		if (!active.length) return null;

		const meta = buildCategoryMeta(catKey, active);

		const seriesData = /** @type {import('$lib/components/charts/v2/types.js').TimeSeriesData[]} */ (
			data.years.map((year) => {
				const startYear = parseInt(String(year).slice(0, 4), 10);
				const time = Date.UTC(startYear, 6, 1);
				/** @type {Record<string, any>} */
				const row = { time, date: new Date(time) };
				for (const p of active) row[p.code] = p.values[year] ?? null;
				return row;
			})
		);

		return {
			seriesNames: meta.seriesNames,
			seriesLabels: meta.seriesLabels,
			seriesColours: meta.seriesColours,
			seriesData
		};
	}

	let sheetProps = $derived(openCategory ? buildCategoryProps(openCategory) : null);
	let sheetMeta = $derived(openCategory ? CATEGORY_META[openCategory] : null);
</script>

<div class="overflow-x-auto">
	<table class="w-full text-[12px] font-mono border-collapse">
		<thead>
			<tr class="text-[10px] text-mid-grey uppercase tracking-widest">
				<th scope="col" class="py-2 pr-3 text-left font-normal whitespace-nowrap">Pollutant</th>
				<th scope="col" class="py-2 px-3 text-left font-normal whitespace-nowrap">Trend</th>
				<th scope="col" class="py-2 px-3 text-right font-normal whitespace-nowrap">
					Latest{#if latestYear}&nbsp;({fiscalYearLabel(latestYear)}){/if}
				</th>
				<th scope="col" class="py-2 pl-3 text-right font-normal whitespace-nowrap">
					vs 5y avg
				</th>
			</tr>
		</thead>

		{#each categoryOrder as catKey (catKey)}
			{@const catMeta = CATEGORY_META[catKey]}
			{@const pollutants = data.byCategory[catKey]}

			<tbody>
				<tr>
					<th
						scope="colgroup"
						colspan="4"
						class="p-0 text-left border-b border-dark-grey font-sans"
					>
						<button
							type="button"
							onclick={() => (openCategory = catKey)}
							class="group flex items-center justify-between w-full px-0 py-2 text-[10px] text-mid-grey uppercase tracking-widest hover:text-dark-grey font-normal cursor-pointer transition-colors"
						>
							<span class="inline-flex items-center gap-1.5">
								<span
									class="inline-block w-1.5 h-1.5 rounded-full"
									style:background-color={catMeta.colour}
								></span>
								{catMeta.label}
							</span>
							<span
								class="inline-flex items-center gap-0.5 text-mid-grey group-hover:text-dark-grey"
							>
								View charts
								<ChevronRight size={12} />
							</span>
						</button>
					</th>
				</tr>

				{#each pollutants as pollutant (pollutant.code)}
					{@const yearValues = data.years.map((y) => pollutant.values[y] ?? null)}
					{@const latest = pollutant.values[latestYear] ?? null}
					{@const trend = computePollutantTrend(yearValues)}

					<tr class="border-b border-warm-grey/40">
						<th
							scope="row"
							class="py-2 pr-3 text-left text-dark-grey font-normal"
						>
							{pollutant.label}
						</th>
						<td class="py-2 px-3 whitespace-nowrap">
							<Sparkline
								values={yearValues}
								colour={catMeta.colour}
								ariaLabel="Trend for {pollutant.label}"
							/>
						</td>
						<td class="py-2 px-3 text-right tabular-nums text-dark-grey whitespace-nowrap">
							{formatPollutantMass(latest)}
						</td>
						<td class="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
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
								<span
									class="inline-flex items-center justify-end gap-1 text-mid-grey"
									aria-label="Flat vs 5-year average"
								>
									<span aria-hidden="true" class="text-[10px] leading-none">–</span>
									{formatDelta(trend.delta)}
								</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		{/each}
	</table>
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
	{#if sheetProps && sheetMeta}
		<div class="px-6 py-5">
			<MiniCharts
				gridColClass="grid-cols-1 sm:grid-cols-2"
				gridGapClass="gap-3"
				sectionPaddingClass="p-4"
				sectionBorderClass="rounded-xl border border-warm-grey"
				reverseOrder={false}
				showMaxReferenceLine
				tooltipMode="compact-strip"
				showCardSummary={false}
				displayUnit=""
				seriesNames={sheetProps.seriesNames}
				seriesLabels={sheetProps.seriesLabels}
				seriesColours={sheetProps.seriesColours}
				seriesData={sheetProps.seriesData}
				formatTickX={fiscalYearLabelFromAny}
				formatTickY={formatPollutantMass}
			/>
		</div>
	{/if}
</Sheet>
