<script>
	import { createEventDispatcher, getContext } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import Bars2 from '$lib/icons/Bars2.svelte';
	import Selection from './Selection.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { formatValue, dataRegionCompareOptions } from './helpers';

	const flipDurationMs = 200;
	const dispatchEvent = createEventDispatcher();

	export let valueColumnName = 'value';
	export let units = '';
	export let seriesItems;
	export let seriesLabels;
	export let seriesColours;
	export let hoverData;
	export let showContribution = false;

	const { selectedGroup } = getContext('scenario-data');

	function handleSort(e) {
		dispatchEvent('sort', e.detail.items);
	}
	/**
	 *
	 * @param {string|null} id
	 */
	function handleHighlight(id) {
		dispatchEvent('highlight', { id });
	}
</script>

<div class="w-full pt-12 mt-1">
	<table class="table w-full table-fixed text-sm border border-warm-grey">
		<thead>
			<tr>
				<th class="w-8" />
				<th class="text-left">
					<div
						class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap"
					>
						<FormSelect
							paddingY="py-2"
							paddingX="px-3"
							options={dataRegionCompareOptions}
							selected={$selectedGroup}
							on:change={(evt) => ($selectedGroup = evt.detail.value)}
						/>
					</div>
				</th>
				<th class="w-[150px] text-right">{valueColumnName} ({units})</th>
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
				<tr
					animate:flip={{ duration: flipDurationMs }}
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
		</tbody>
	</table>
</div>

<style>
	th {
		@apply bg-light-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs;
	}
	td {
		@apply px-3 py-2 border-b border-warm-grey;
	}
</style>
