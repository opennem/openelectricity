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

	/**
	 * @typedef {Object} Props
	 * @property {string} [valueColumnName]
	 * @property {string} [units]
	 * @property {any} seriesItems
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
		seriesLabels,
		seriesColours,
		hoverData,
		showContribution = false
	} = $props();

	const { selectedGroup } = getContext('scenario-data');

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
				<th class="w-8 bg-light-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs"></th>
				<th class="text-left bg-light-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs">
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
				<th
					class="w-[150px] text-right bg-light-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs"
					>{valueColumnName} ({units})</th
				>
				{#if showContribution}
					<th
						class="w-[100px] text-right bg-light-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs"
						>Contribution</th
					>
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
					<td class="group-hover:bg-light-warm-grey px-3 py-2 border-b border-warm-grey">
						<div
							class="rounded-full bg-mid-grey w-4 h-4"
							style="background-color: {seriesColours[name]}"
						></div>
					</td>
					<td
						class="whitespace-nowrap group-hover:bg-light-warm-grey px-3 py-2 border-b border-warm-grey"
					>
						{seriesLabels[name]}
					</td>
					<td class="text-right group-hover:bg-light-warm-grey px-3 py-2 border-b border-warm-grey"
						>{hoverData ? formatValue(hoverData[name]) : ''}</td
					>

					{#if showContribution}
						<td
							class="text-right group-hover:bg-light-warm-grey px-3 py-2 border-b border-warm-grey"
						>
							{hoverData ? formatValue((hoverData[name] / hoverData._max) * 100) + '%' : ''}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
