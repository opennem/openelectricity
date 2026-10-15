<script>
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import ComparePicker from './ComparePicker.svelte';
	import CompareChangeList from './CompareChangeList.svelte';
	import CompareValueTiles from './CompareValueTiles.svelte';
	import CompareSlopeChart from './CompareSlopeChart.svelte';
	import {
		compareDataset,
		compareRows,
		compareTotals,
		formatComparePercent,
		nearestCompareTime,
		sortCompareRows,
		stepCompareTime
	} from './chart-compare.js';
	import { getChartDownloads, chartDownload } from '../chart-downloads.svelte.js';

	/**
	 * ComparePanel — a chart card's compare mode (`ChartCard`'s `compare`),
	 * whatever the chart: the A / B picker, then the comparison drawn for the
	 * source's kind (`snapshot-sources.js`, or a page's own sources):
	 *
	 * - `composition` (a stack): the net total and a change list per
	 *   technology or unit, loads read as consumption, from the largest rise
	 *   to the largest fall (or in stack order);
	 * - `single` (one line): A and B value tiles over the window's range;
	 * - `lines` (independent lines: a region each, or a direction): a slope
	 *   chart, or a bump chart under ranks, beside a change list; with a
	 *   colour scale (`colourOf`, the heatmap's), the list alone with each
	 *   value's shade as a chip.
	 *
	 * A and B are the page's (every comparing card shares them): picks and
	 * swaps report through `onchange`, which pushes history, and stepping
	 * replaces it. The graphics are SVG inside one image root, so the panel is
	 * its own PNG export, and it registers its own download (`<card>-comparison`).
	 * A visually hidden table carries every value for assistive technology.
	 *
	 * @type {{
	 *   source: import('../types.js').CompareSource | null,
	 *   pair: import('./chart-compare.js').ComparePair,
	 *   armed: import('./chart-compare.js').CompareSlot,
	 *   pending?: boolean,
	 *   error?: string | null,
	 *   id: string,
	 *   label: string,
	 *   fileName?: (extension: 'csv') => string,
	 *   hovered?: string,
	 *   onhover?: (id: string | undefined) => void,
	 *   onarm: (slot: import('./chart-compare.js').CompareSlot) => void,
	 *   onchange: (pair: import('./chart-compare.js').ComparePair, history: 'push' | 'replace') => void,
	 *   onreveal?: () => void
	 * }}
	 */
	let {
		source,
		pair,
		armed,
		pending = false,
		error = null,
		id,
		label,
		fileName,
		hovered,
		onhover,
		onarm,
		onchange,
		onreveal
	} = $props();

	/** Rows by their change, largest rise first, unless the reader picks stack order. */
	let order = $state(/** @type {'stack' | 'change'} */ ('change'));
	let times = $derived(source?.times ?? []);
	/** @param {number | null} time @returns {'ok' | 'unset' | 'missing'} */
	function slotState(time) {
		if (time === null) return 'unset';
		if (!source) return pending ? 'ok' : 'missing';
		return (source.has ? source.has(time) : times.includes(time)) ? 'ok' : 'missing';
	}
	let states = $derived({ a: slotState(pair.a), b: slotState(pair.b) });
	let ready = $derived(!!source && !error && states.a === 'ok' && states.b === 'ok');
	let rows = $derived(ready ? compareRows(source, pair) : []);
	let shown = $derived(sortCompareRows(rows, order));
	let total = $derived(source?.kind === 'composition' && rows.length ? compareTotals(rows) : null);
	let hasValues = $derived(rows.some((row) => row.delta !== null));
	let labels = $derived({
		a: pair.a === null || !source ? '' : source.formatTime(pair.a),
		b: pair.b === null || !source ? '' : source.formatTime(pair.b)
	});

	/** @param {import('./chart-compare.js').CompareSlot} slot @param {number} steps */
	function step(slot, steps) {
		const next = stepCompareTime(times, pair[slot], steps);
		if (next !== null && next !== pair[slot]) onchange({ ...pair, [slot]: next }, 'replace');
	}
	/** @param {import('./chart-compare.js').CompareSlot} slot */
	function nearest(slot) {
		const time = pair[slot];
		const next = time === null ? null : nearestCompareTime(times, time);
		if (next !== null) onchange({ ...pair, [slot]: next }, 'push');
	}

	/** The comparison as drawn, or null until both dates have values. */
	function dataset() {
		if (!source || !hasValues) return null;
		return compareDataset(rows, {
			key: id,
			title: label,
			rowHeader: source.rowHeader,
			unit: source.baseUnit,
			mode: source.deltaMode,
			// Downloads name A and B with their years, as the screen may not.
			a: pair.a === null ? '' : (source.formatExportTime ?? source.formatTime)(pair.a),
			b: pair.b === null ? '' : (source.formatExportTime ?? source.formatTime)(pair.b),
			context: source.context
		});
	}
	const registerDownload = chartDownload(getChartDownloads(), () => ({
		id,
		label,
		state: error ? 'error' : pending && !ready ? 'loading' : hasValues ? 'ready' : 'empty',
		message: !error && !pending && !hasValues ? 'Choose two dates with data' : undefined,
		dataset,
		fileName
	}));

	let caption = $derived(hasValues ? `A: ${labels.a} · B: ${labels.b}` : '');
	let imageMetadata = $derived(
		JSON.stringify({
			hasData: hasValues,
			title: source?.title ?? label,
			unit: source?.deltaMode === 'rank' ? '' : (source?.unit ?? ''),
			transform: '',
			legend: []
		})
	);
</script>

<div
	class="@container flex flex-col gap-3 bg-light-warm-grey/40 px-4 pb-4 pt-3"
	{@attach registerDownload}
	data-chart-download={id}
	data-chart-png={JSON.stringify({ id, label, ready: hasValues, caption })}
	aria-busy={pending}
>
	<ComparePicker
		{pair}
		{armed}
		{states}
		{times}
		formatTime={source?.formatTime ?? String}
		disabled={!source}
		{onarm}
		onstep={step}
		onswap={() => onchange({ a: pair.b, b: pair.a }, 'push')}
		onnearest={nearest}
		{onreveal}
	/>

	{#if error}
		<p role="status" class="m-0 text-sm text-mid-grey">
			Comparison unavailable: {error}. Retry the chart to reload its data.
		</p>
	{:else if !source || (pending && !ready)}
		<div class="h-24 animate-pulse rounded-md bg-warm-grey/60" aria-hidden="true"></div>
	{:else if !ready}
		<p role="status" class="m-0 text-sm text-mid-grey">
			{#if states.a === 'unset' || states.b === 'unset'}
				Click the chart to choose {states.a === 'unset' ? 'A' : 'B'}.
			{:else if onreveal}
				A date is outside what the chart has loaded. Show it in the chart, or use the nearest date.
			{:else}
				A date has no reading at this interval. Use the nearest date instead.
			{/if}
		</p>
	{:else if !rows.length}
		<p role="status" class="m-0 text-sm text-mid-grey">
			Everything this chart draws is hidden. Show a series to compare it.
		</p>
	{:else}
		{#if !hasValues}
			<p role="status" class="m-0 text-sm text-mid-grey">
				No comparable readings at these dates. Missing readings show —, never zero.
			</p>
		{/if}
		{#if source.kind === 'composition'}
			<div class="flex items-center justify-end">
				<SwitchTabs
					compact
					ariaLabel="Order"
					buttons={[
						{ label: 'Largest change', value: 'change' },
						{ label: 'Stack order', value: 'stack' }
					]}
					selected={order}
					onChange={(value) => (order = /** @type {'stack' | 'change'} */ (value))}
				/>
			</div>
		{/if}
		<div data-chart-image={imageMetadata}>
			<div data-chart-area class="relative">
				{#if source.kind === 'single'}
					<CompareValueTiles row={rows[0]} {source} {labels} />
				{:else if source.kind === 'lines' && !source.colourOf}
					<div class="grid gap-4 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:items-start">
						<CompareSlopeChart rows={shown} {source} {labels} {hovered} {onhover} />
						<CompareChangeList rows={shown} {source} {hovered} {onhover} />
					</div>
				{:else if source.kind === 'lines'}
					<!-- The heatmap's own shades read A and B: chips, no slope. -->
					<CompareChangeList rows={shown} {source} {hovered} {onhover} />
				{:else}
					<CompareChangeList rows={shown} {source} {total} {hovered} {onhover} />
				{/if}
			</div>
		</div>
		{#if source.note}<p class="m-0 text-xxs text-mid-grey">{source.note}</p>{/if}
	{/if}

	{#if ready && rows.length}
		<table class="sr-only">
			<caption>{label}: A {labels.a}, B {labels.b}</caption>
			<thead>
				<tr>
					<th scope="col">{source?.rowHeader}</th>
					<th scope="col">A</th>
					<th scope="col">B</th>
					<th scope="col">Change</th>
					{#if source?.deltaMode === 'relative'}<th scope="col">Change (%)</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#if total}
					<tr>
						<th scope="row">Net total</th>
						<td>{source?.format(total.a)}</td>
						<td>{source?.format(total.b)}</td>
						<td>{source?.formatDelta(total.delta)}</td>
						<td>{formatComparePercent(total.percent)}</td>
					</tr>
				{/if}
				{#each rows as row (row.id)}
					<tr data-testid="compare-table-row">
						<th scope="row">{row.label}</th>
						<td>{source?.format(row.a)}</td>
						<td>{source?.format(row.b)}</td>
						<td>{source?.formatDelta(row.delta)}</td>
						{#if source?.deltaMode === 'relative'}<td>{formatComparePercent(row.percent)}</td>{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
