<script>
	import { datasetColumnPlaces, formatDatasetCell } from './export-dataset.js';

	/**
	 * ChartDataTable — a chart card's table view: the card's download dataset
	 * (the rows and columns its CSV holds) as a table filling the card body.
	 * Only the rows in view render, so a week of 5-minute rows stays cheap; the
	 * header row and the first (time or name) column stay pinned while scrolling.
	 * `status` replaces the table while the chart has nothing to show.
	 *
	 * @type {{
	 *   dataset: import('./types.js').ExportDataset | null,
	 *   label: string,
	 *   timeZone: string,
	 *   status?: string
	 * }}
	 */
	let { dataset, label, timeZone, status = '' } = $props();

	const ROW_PX = 28;
	/** Rows rendered beyond each edge of the view, so scrolling never shows a gap. */
	const OVERSCAN = 12;

	let scrollTop = $state(0);
	let viewHeight = $state(0);

	let columns = $derived(dataset?.columns ?? []);
	/** Each number column's decimal places, so its figures line up. */
	let places = $derived(dataset ? datasetColumnPlaces(dataset) : {});
	let rows = $derived(dataset?.rows ?? []);
	let first = $derived(Math.max(0, Math.floor(scrollTop / ROW_PX) - OVERSCAN));
	let last = $derived(
		Math.min(rows.length, Math.ceil((scrollTop + viewHeight) / ROW_PX) + OVERSCAN)
	);
	let shown = $derived(rows.slice(first, last));

	/** @param {import('./types.js').ExportColumn} column */
	const numeric = (column) => column.type === 'number';
	/** Headers as the CSV writes them, capitalised for display (`date` → `Date`).
	 * @param {string} header */
	const heading = (header) => header.charAt(0).toUpperCase() + header.slice(1);
</script>

{#if status || !rows.length}
	<p class="m-0 flex h-full items-center justify-center p-4 text-sm text-mid-grey" role="status">
		{status || 'No data'}
	</p>
{:else}
	<div
		class="h-full overflow-auto overscroll-contain"
		role="region"
		aria-label="{label} data"
		tabindex="0"
		data-testid="chart-data-table"
		bind:clientHeight={viewHeight}
		onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}
	>
		<table
			class="w-full border-separate border-spacing-0 text-xs tabular-nums"
			aria-rowcount={rows.length + 1}
		>
			<thead>
				<tr aria-rowindex={1}>
					{#each columns as column, index (column.key)}
						<th
							scope="col"
							class="sticky top-0 z-10 whitespace-nowrap border-b border-mid-warm-grey/40 bg-light-warm-grey px-3 py-2 font-space text-xxs font-normal text-mid-grey {numeric(
								column
							)
								? 'text-right'
								: 'text-left'} {index === 0 ? 'left-0 z-20' : ''}"
						>
							{heading(column.header)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if first > 0}
					<tr aria-hidden="true" style:height="{first * ROW_PX}px">
						<td colspan={columns.length}></td>
					</tr>
				{/if}
				{#each shown as row, offset (first + offset)}
					<tr aria-rowindex={first + offset + 2} style:height="{ROW_PX}px" class="group">
						{#each columns as column, index (column.key)}
							{@const text = formatDatasetCell(column, row, timeZone, places[column.key])}
							{#if index === 0}
								<th
									scope="row"
									class="sticky left-0 whitespace-nowrap border-b border-warm-grey bg-white px-3 text-left font-normal text-dark-grey group-hover:bg-light-warm-grey"
								>
									{text}
								</th>
							{:else}
								<td
									class="whitespace-nowrap border-b border-warm-grey px-3 group-hover:bg-light-warm-grey {numeric(
										column
									)
										? 'text-right font-mono'
										: 'text-left'}"
								>
									{text}
								</td>
							{/if}
						{/each}
					</tr>
				{/each}
				{#if last < rows.length}
					<tr aria-hidden="true" style:height="{(rows.length - last) * ROW_PX}px">
						<td colspan={columns.length}></td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}
