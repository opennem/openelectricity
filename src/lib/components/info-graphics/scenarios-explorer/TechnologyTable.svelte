<script>
	import { createEventDispatcher, getContext } from 'svelte';
	import { flip } from 'svelte/animate';
	import Bars2 from '$lib/icons/Bars2.svelte';
	import Selection from './Selection.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { formatValue, dataTechnologyGroupOptions } from './helpers';

	const flipDurationMs = 200;
	const dispatchEvent = createEventDispatcher();

	/**
	 * @typedef {Object} Props
	 * @property {string} [valueColumnName]
	 * @property {string} [units]
	 * @property {any} seriesItems
	 * @property {any} seriesLoadsIds
	 * @property {any} seriesLabels
	 * @property {any} seriesColours
	 * @property {any} hoverData
	 * @property {boolean} [showContribution]
	 */

	/** @type {Props} */
	let {
		valueColumnName = 'value',
		units = '',
		seriesItems,
		seriesLoadsIds,
		seriesLabels,
		seriesColours,
		hoverData,
		showContribution = false
	} = $props();

	const { selectedGroup } = getContext('scenario-data');

	// $: console.log('seriesItems', seriesItems, seriesLoadsIds);
	let sourceItems = $derived(seriesItems.filter((/** @type {any} */ d) => !seriesLoadsIds.includes(d.id)));
	let loadItems = $derived(seriesItems.filter((/** @type {any} */ d) => seriesLoadsIds.includes(d.id)));
	let sourcesTotal = $derived(
		hoverData ? sourceItems.reduce((/** @type {number} */ acc, /** @type {{ id: string }} */ { id }) => acc + hoverData[id], 0) : 0
	);
	let loadsTotal = $derived(
		hoverData ? loadItems.reduce((/** @type {number} */ acc, /** @type {{ id: string }} */ { id }) => acc + hoverData[id], 0) : 0
	);

	function handleSort(/** @type {any} */ e) {
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
				<th class="w-8 bg-light-warm-grey px-3 py-6 text-xs"></th>
				<th class="text-left bg-light-warm-grey px-3 py-6 text-xs">
					<div
						class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap"
					>
						<FormSelect
							paddingY="py-2"
							paddingX="px-3"
							options={dataTechnologyGroupOptions}
							selected={$selectedGroup}
							onchange={(option) => ($selectedGroup = option.value)}
						/>
					</div>
				</th>
				<th class="w-[150px] text-right bg-light-warm-grey px-3 py-6 text-xs"
					>{valueColumnName} ({units})</th
				>
				{#if showContribution}
					<th class="w-[100px] text-right bg-light-warm-grey px-3 py-6 text-xs">Contribution</th>
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
				<th class="px-3 py-2 text-xs"></th>
				<th class="text-left px-3 py-2 text-xs">Sources</th>
				<th class="text-right px-3 py-2 text-xs">{sourcesTotal ? formatValue(sourcesTotal) : ''}</th
				>
				<th class="px-3 py-2 text-xs"></th>
			</tr>

			{#each sourceItems as { id, name } (id)}
				<tr
					class="group"
					onmouseover={() => handleHighlight(id)}
					onmouseleave={() => handleHighlight(null)}
					onfocus={() => handleHighlight(id)}
				>
					<!-- <td>
						<div
							aria-label="drag-handle for {seriesLabels[name]}"
							class="w-6 h-6 p-1 flex items-center justify-center group-hover:bg-warm-grey rounded-sm"
						>
							<Bars2 />
						</div>
					</td> -->
					<td class="group-hover:bg-light-warm-grey px-3 py-2 text-xs">
						<div
							class="rounded-full bg-mid-grey w-4 h-4"
							style="background-color: {seriesColours[name]}"
						></div>
					</td>
					<td class="whitespace-nowrap group-hover:bg-light-warm-grey px-3 py-2 text-xs">
						{seriesLabels[name]}
					</td>
					<td class="text-right group-hover:bg-light-warm-grey px-3 py-2 text-xs"
						>{hoverData ? formatValue(hoverData[name]) : ''}</td
					>

					{#if showContribution}
						<td class="text-right group-hover:bg-light-warm-grey px-3 py-2 text-xs">
							{hoverData ? formatValue((hoverData[name] / hoverData._max) * 100) + '%' : ''}
						</td>
					{/if}
				</tr>
			{/each}

			<tr>
				<th class="px-3 py-2 text-xs"></th>
				<th class="text-left px-3 py-2 text-xs">Loads</th>
				<th class="text-right px-3 py-2 text-xs">{loadsTotal ? formatValue(loadsTotal) : ''}</th>
				<th class="px-3 py-2 text-xs"></th>
			</tr>

			{#each loadItems as { id, name } (id)}
				<tr class="group">
					<td class="px-3 py-2 text-xs">
						<div
							class="rounded-full bg-mid-grey w-4 h-4"
							style="background-color: {seriesColours[name]}"
						></div>
					</td>
					<td class="whitespace-nowrap px-3 py-2 text-xs">
						{seriesLabels[name]}
					</td>
					<td class="text-right">{hoverData ? formatValue(hoverData[name]) : ''}</td>

					{#if showContribution}
						<td class="text-right px-3 py-2 text-xs">
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
				<th class="bg-light-warm-grey px-3 py-2 text-xs"></th>
				<th class="text-left bg-light-warm-grey px-3 py-2 text-xs">Net</th>
				<th class="text-right bg-light-warm-grey px-3 py-2 text-xs">
					{hoverData ? formatValue(hoverData._max) : ''}
				</th>
				{#if showContribution}
					<th class="bg-light-warm-grey px-3 py-2 text-xs"></th>
				{/if}
			</tr>
		</tfoot>
	</table>
</div>
