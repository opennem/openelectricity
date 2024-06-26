<script>
	import { createEventDispatcher, getContext } from 'svelte';
	import { flip } from 'svelte/animate';
	import Bars2 from '$lib/icons/Bars2.svelte';
	import Selection from './Selection.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { formatValue, dataTechnologyGroupOptions } from './helpers';

	const flipDurationMs = 200;
	const dispatchEvent = createEventDispatcher();

	export let valueColumnName = 'value';
	export let seriesItems;
	export let seriesLoadsIds;
	export let seriesLabels;
	export let seriesColours;
	export let hoverData;
	export let showContribution = false;

	const { selectedGroup } = getContext('scenario-data');

	// $: console.log('seriesItems', seriesItems, seriesLoadsIds);
	$: sourceItems = seriesItems.filter((d) => !seriesLoadsIds.includes(d.id));
	$: loadItems = seriesItems.filter((d) => seriesLoadsIds.includes(d.id));
	$: sourcesTotal = hoverData ? sourceItems.reduce((acc, { id }) => acc + hoverData[id], 0) : 0;
	$: loadsTotal = hoverData ? loadItems.reduce((acc, { id }) => acc + hoverData[id], 0) : 0;

	function handleSort(e) {
		// dispatchEvent('sort', e.detail.items);
	}
	/**
	 *
	 * @param {string|null} id
	 */
	function handleHighlight(id) {
		dispatchEvent('highlight', { id });
	}
</script>

<div class="w-full mt-[32px] max-h-[540px] overflow-y-auto border border-warm-grey">
	<table class="table w-full table-fixed text-sm">
		<thead class="main-thead sticky top-0">
			<tr>
				<th class="w-8" />
				<th class="text-left">
					<div
						class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap"
					>
						<FormSelect
							paddingY="py-2"
							paddingX="px-3"
							options={dataTechnologyGroupOptions}
							selected={$selectedGroup}
							on:change={(evt) => ($selectedGroup = evt.detail.value)}
						/>
					</div>
				</th>
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
		<!-- <thead class="sub-thead">
			<tr>
				<th />
				<th class="text-left">Sources</th>
				<th class="text-right">{sourcesTotal ? formatValue(sourcesTotal) : ''}</th>
				<th />
			</tr>
		</thead> -->
		<tbody class="overflow-y-auto">
			<tr>
				<th />
				<th class="text-left">Sources</th>
				<th class="text-right">{sourcesTotal ? formatValue(sourcesTotal) : ''}</th>
				<th />
			</tr>

			{#each sourceItems as { id, name } (id)}
				<tr
					class="group"
					on:mouseover={() => handleHighlight(id)}
					on:mouseleave={() => handleHighlight(null)}
					on:focus={() => handleHighlight(id)}
				>
					<!-- <td>
						<div
							aria-label="drag-handle for {seriesLabels[name]}"
							class="w-6 h-6 p-1 flex items-center justify-center group-hover:bg-warm-grey rounded"
						>
							<Bars2 />
						</div>
					</td> -->
					<td class="group-hover:bg-light-warm-grey">
						<div
							class="rounded-full bg-mid-grey w-4 h-4"
							style="background-color: {seriesColours[name]}"
						/>
					</td>
					<td class="whitespace-nowrap group-hover:bg-light-warm-grey">
						{seriesLabels[name]}
					</td>
					<td class="text-right group-hover:bg-light-warm-grey"
						>{hoverData ? formatValue(hoverData[name]) : ''}</td
					>

					{#if showContribution}
						<td class="text-right group-hover:bg-light-warm-grey">
							{hoverData ? formatValue((hoverData[name] / hoverData._max) * 100) + '%' : ''}
						</td>
					{/if}
				</tr>
			{/each}

			<tr>
				<th />
				<th class="text-left">Loads</th>
				<th class="text-right">{loadsTotal ? formatValue(loadsTotal) : ''}</th>
				<th />
			</tr>

			{#each loadItems as { id, name } (id)}
				<tr class="group">
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

		<!-- <thead class="sub-thead">
			
		</thead>
		<tbody>
			{#each loadItems as { id, name } (id)}
				<tr animate:flip={{ duration: flipDurationMs }} class="group">
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
		</tbody> -->

		<tfoot class="sticky bottom-0 border-t border-mid-warm-grey">
			<tr>
				<!-- <td /> -->
				<th />
				<th class="text-left">Net</th>
				<th class="text-right">{hoverData ? formatValue(hoverData._max) : ''}</th>
				{#if showContribution}
					<th />
				{/if}
			</tr>
		</tfoot>
	</table>
</div>

<style>
	.main-thead th {
		@apply bg-light-warm-grey px-3 py-6 text-xs;
	}

	td,
	th {
		@apply px-3 py-2 text-xs;
	}
	tfoot th {
		@apply bg-light-warm-grey  px-3 py-2;
	}
</style>
