<script>
	import { getContext } from 'svelte';
	import { color } from 'd3-color';
	import TableHeader from './TableHeader.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} [seriesLoadsIds]
	 * @property {string[]} [hiddenRowNames]
	 * @property {string} [title]
	 * @property {(detail: {name: string, isMetaPressed: boolean, allNames: string[]}) => void} [onrowclick]
	 */

	/** @type {Props} */
	let { seriesLoadsIds = [], hiddenRowNames = [], title = '', onrowclick } = $props();

	const { includeBatteryAndLoads } = getContext('scenario-filters');
	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');

	let isMetaPressed = false;

	/**
	 * @param {string} name
	 */
	function handleRowClick(name) {
		onrowclick?.({ name, isMetaPressed, allNames: generation.seriesNames });
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
	 * @param {string} colorString
	 */
	function darken(colorString) {
		// @ts-ignore
		return colorString ? color(colorString).darker(0.5).formatHex() : 'transparent';
	}
</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<TableHeader
		includeBatteryAndLoads={$includeBatteryAndLoads}
		hoverTime={generation.hoverTime || generation.focusTime}
		onchange={() => ($includeBatteryAndLoads = !$includeBatteryAndLoads)}
	/>

	<table class="w-full border border-warm-grey">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[40%] px-2 py-6 text-sm font-medium text-left">
					<span class="block text-dark-grey text-sm font-medium ml-3">{title}</span>
				</th>
				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end">
						<span class="block text-xs">Generation</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() => generation.chartOptions.cyclePrefix()}
						>
							{generation.chartOptions.displayUnit}
						</button>
					</div>
				</th>

				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end">
						<span class="block text-xs">Capacity</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() => capacity.chartOptions.cyclePrefix()}
						>
							{capacity.chartOptions.displayUnit}
						</button>
					</div>
				</th>

				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end">
						<span class="block text-xs">Emissions</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() => emissions.chartOptions.cyclePrefix()}
						>
							{emissions.chartOptions.displayUnit}
						</button>
					</div>
				</th>
				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end mr-3">
						<span class="block text-xs">Intensity</span>
						<small class="font-light text-xxs">{intensity.chartOptions.displayUnit}</small>
					</div>
				</th>
			</tr>
		</thead>

		<tbody class="border-b border-warm-grey">
			<tr>
				<td colspan="5" class="h-4"></td>
			</tr>
			{#each generation.seriesNames as name, i (name)}
				<tr
					class="hover:bg-light-warm-grey group cursor-pointer text-sm"
					onclick={() => handleRowClick(name)}
					class:opacity-50={hiddenRowNames.includes(name)}
				>
					<td class="px-2 py-1">
						<div class="flex items-start gap-3 ml-3">
							{#if hiddenRowNames.includes(name)}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded-sm bg-transparent border-mid-warm-grey group-hover:border-mid-grey relative top-1"
								></div>
							{:else}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded-sm relative top-1"
									style:background-color={generation.seriesColours[name]}
									style:border-color={darken(generation.seriesColours[name])}
								></div>
							{/if}
							<div>
								{generation.seriesLabels[name]}
							</div>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{generation.hoverData
								? generation.convertAndFormatValue(generation.hoverData[name])
								: generation.focusData
									? generation.convertAndFormatValue(generation.focusData[name])
									: ''}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{capacity.hoverData
								? capacity.convertAndFormatValue(capacity.hoverData[name])
								: capacity.focusData
									? capacity.convertAndFormatValue(capacity.focusData[name])
									: ''}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{emissions.hoverData
								? emissions.convertAndFormatValue(emissions.hoverData[name])
								: emissions.focusData
									? emissions.convertAndFormatValue(emissions.focusData[name])
									: ''}
						</div>
					</td>
					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end mr-3">
							{intensity.hoverData
								? intensity.convertAndFormatValue(intensity.hoverData[name])
								: intensity.focusData
									? intensity.convertAndFormatValue(intensity.focusData[name])
									: ''}
						</div>
					</td>
				</tr>
			{/each}
			<tr>
				<td colspan="5" class="h-4"></td>
			</tr>
		</tbody>
	</table>
</div>
