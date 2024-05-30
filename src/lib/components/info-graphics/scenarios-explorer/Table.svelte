<script>
	import { createEventDispatcher } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import Bars2 from '$lib/icons/Bars2.svelte';

	import { formatValue } from './helpers';

	const flipDurationMs = 200;
	const dispatchEvent = createEventDispatcher();

	export let valueColumnName = 'value';
	export let seriesItems;
	export let seriesLabels;
	export let seriesColours;
	export let hoverData;
	export let showContribution = false;

	function handleSort(e) {
		dispatchEvent('sort', e.detail.items);
	}
</script>

<div class="w-full">
	<table class="table w-full table-fixed text-sm">
		<thead>
			<tr>
				<!-- <th class="w-8" /> -->
				<th class="w-8" />
				<th />
				<th class="w-[150px] text-right">{valueColumnName}</th>
				{#if showContribution}
					<th class="w-[100px] text-right">Contribution</th>
				{/if}
			</tr>
		</thead>

		<!-- <tbody
			use:dndzone={{ items: seriesItems, flipDurationMs }}
			on:consider={handleSort}
			on:finalize={handleSort}
		> -->
		<tbody>
			{#each seriesItems as { id, name } (id)}
				<tr animate:flip={{ duration: flipDurationMs }} class="group">
					<!-- <td>
						<div
							aria-label="drag-handle for {seriesLabels[name]}"
							class="w-6 h-6 p-1 flex items-center justify-center group-hover:bg-warm-grey rounded"
						>
							<Bars2 />
						</div>
					</td> -->
					<td>
						<div
							class="rounded-full bg-mid-grey w-4 h-4"
							style="background-color: {seriesColours[name]}"
						/>
					</td>
					<td class="whitespace-nowrap">
						{seriesLabels[name]}
					</td>
					<td class="text-right">{hoverData ? formatValue(hoverData[name]) : ''}</td>

					{#if showContribution}
						<td class="text-right">
							{hoverData ? formatValue((hoverData[name] / hoverData._max) * 100) + '%' : ''}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>

		<tfoot>
			<tr>
				<!-- <td /> -->
				<td />
				<td class="font-bold">Total</td>
				<td class="text-right">{hoverData ? formatValue(hoverData._max) : ''}</td>
				{#if showContribution}
					<td />
				{/if}
			</tr>
		</tfoot>
	</table>
</div>

<style>
	th {
		@apply bg-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs;
	}
	td {
		@apply px-3 py-2 border-b border-warm-grey;
	}
</style>
