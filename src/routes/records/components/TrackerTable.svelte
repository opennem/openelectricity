<script>
	import { createBubbler } from 'svelte/legacy';
	import { getContext, createEventDispatcher } from 'svelte';
	import darken from '$lib/utils/colour-darken';

	const bubble = createBubbler();
	const dispatch = createEventDispatcher();

	/** @type {Props} */
	let { seriesLoadsIds = [] } = $props();
	const {
		seriesNames,
		hiddenSeriesNames,
		seriesColours,
		seriesLabels,
		displayUnit,
		hoverKey,
		hoverData,
		focusData,
		hoverProportionData,
		focusProportionData,
		displayPrefix,
		getNextPrefix,
		convertAndFormatValue,
		visibleSeriesNames,
		formatValue
	} = getContext('tracker-data-viz');

	let sourceNames = $derived(
		$visibleSeriesNames.filter((/** @type {string} */ d) => !seriesLoadsIds.includes(d)).reverse()
	);

	let uniqueSeriesWithoutType = $derived([
		...new Set(
			[...$seriesNames].reverse().map((id) => {
				// only want the first part of the id
				const parts = id.split('.');
				return parts[0];
			})
		)
	]);
	let rowNames = $derived([...$seriesNames].reverse());

	let energySourcesTotal = $derived(
		$hoverData
			? sourceNames.reduce(
					/**
					 * @param {number} acc
					 * @param {string} id
					 */
					(acc, id) => acc + $hoverData[id],
					0
				)
			: $focusData
				? sourceNames.reduce(
						/**
						 * @param {number} acc
						 * @param {string} id
						 */
						(acc, id) => acc + $focusData[id],
						0
					)
				: 0
	);

	let isMetaPressed = false;

	/**
	 * @param {string} name
	 */
	function handleRowClick(name) {
		dispatch('row-click', { name, isMetaPressed, allNames: uniqueSeriesWithoutType });
	}

	/**
	 * @param {string} name
	 */
	function handleTouchstart(name) {
		dispatch('touchstart', { name });
	}

	function handleKeyup() {
		isMetaPressed = false;
	}

	/**
	 * @param {KeyboardEvent} evt
	 */
	function handleKeydown(evt) {
		if (evt.metaKey || evt.altKey) {
			isMetaPressed = true;
		} else {
			isMetaPressed = false;
		}
	}

	/**
	 * @param {string} key
	 */
	function handleMouseenter(key) {
		$hoverKey = key;
	}
	function handleMouseleave() {
		$hoverKey = undefined;
	}
</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<table class="w-full table-fixed border-warm-grey mb-8 text-xs">
	<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
		<tr>
			<th class="w-[45%]">
				<div class="flex items-center gap-4"></div>
			</th>

			<!-- <th>
				<div class="flex flex-col items-end">
					<span class="block text-xs">Contribution</span>
					<span class="font-light text-xxs">%</span>
				</div>
			</th> -->

			<th>
				<div class="flex flex-col items-end mr-3">
					<!-- <span class="block text-xs">Generation</span> -->
					<button
						class="font-light text-xxs hover:underline"
						onclick={() => ($displayPrefix = getNextPrefix())}
					>
						{$displayUnit}
					</button>
				</div>
			</th>
		</tr>
	</thead>

	<thead>
		<tr>
			<th class="border-b border-warm-grey">
				<span class="ml-3"> Net total </span>
			</th>
			<!-- <th class="border-b border-warm-grey"></th> -->

			<th class="border-b border-warm-grey">
				<div class="font-mono flex flex-col items-end mr-3">
					{$convertAndFormatValue(energySourcesTotal)}
				</div>
			</th>
		</tr>
	</thead>

	<tbody>
		{#each rowNames as name}
			{@const isImports = name.includes('import')}
			{@const energyValue = $hoverData ? $hoverData[name] : $focusData ? $focusData[name] : ''}
			{@const energyPercent = $hoverProportionData
				? $hoverProportionData[name]
				: $focusProportionData
					? $focusProportionData[name]
					: ''}
			<tr
				onclick={() => handleRowClick(name)}
				onmouseenter={() => handleMouseenter(name)}
				onmouseleave={() => handleMouseleave()}
				ontouchstart={() => handleTouchstart(name)}
				ontouchend={bubble('touchend')}
				class="hover:bg-light-warm-grey group cursor-pointer relative top-2"
				class:opacity-50={$hiddenSeriesNames.includes(name)}
			>
				<td class="px-2 py-1">
					<div class="flex items-center gap-3 ml-3">
						{#if $hiddenSeriesNames.includes(name)}
							<div
								class="w-6 h-6 min-w-6 min-h-6 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
							></div>
						{:else}
							<div
								class="w-6 h-6 min-w-6 min-h-6 border rounded"
								style:background-color={$seriesColours[name]}
								style:border-color={darken($seriesColours[name])}
							></div>
						{/if}

						<div>
							{#if $seriesLabels[name]}
								{isImports && energyValue < 0 ? 'Export' : $seriesLabels[name]}
							{:else}
								{name}
							{/if}
						</div>
					</div>
				</td>

				<!-- <td class="px-2 py-1">
					<div class="font-mono text-xs flex items-center justify-end gap-1">
						<span>
							{formatValue(energyPercent)}
						</span>
						<small>%</small>
					</div>
				</td> -->

				<td class="px-2 py-1">
					<div class="font-mono flex flex-col items-end mr-3">
						{$convertAndFormatValue(energyValue)}
					</div>
				</td>
			</tr>
		{/each}
	</tbody>

	<tfoot>
		<tr>
			<td class="h-4"></td>
		</tr>
	</tfoot>
</table>

<style>
	.main-thead th {
		@apply px-2  text-xs font-medium;
	}
	th {
		@apply text-left px-2 py-1 font-medium;
	}
</style>
