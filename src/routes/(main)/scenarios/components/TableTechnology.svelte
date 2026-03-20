<script>
	import { getContext } from 'svelte';
	import { color } from 'd3-color';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { groupOptions } from '../page-data-options/groups-technology';
	import TableHeader from './TableHeader.svelte';
	import AboutData from './AboutData.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} [seriesLoadsIds]
	 * @property {string[]} [hiddenRowNames]
	 * @property {(detail: { name: string, isMetaPressed: boolean, allNames: string[] }) => void} [onrowclick]
	 */

	/** @type {Props} */
	let { seriesLoadsIds = [], hiddenRowNames = [], onrowclick } = $props();

	const { selectedFuelTechGroup, includeBatteryAndLoads } = getContext('scenario-filters');
	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');

	// Map generation series names to capacity series names (they differ by type suffix,
	// e.g. 'coal.energy.grouped' vs 'coal.capacity.grouped')
	let capNameMap = $derived.by(() => {
		/** @type {Record<string, string>} */
		const capByCode = {};
		for (const name of capacity.seriesNames) {
			const code = name.split('.')[0];
			capByCode[code] = name;
		}
		/** @type {Record<string, string>} */
		const map = {};
		for (const name of generation.seriesNames) {
			const code = name.split('.')[0];
			if (capByCode[code]) map[name] = capByCode[code];
		}
		return map;
	});

	let sourceNames = $derived(
		generation.seriesNames
			.filter((/** @type {string} */ d) => !seriesLoadsIds.includes(d))
			.reverse()
	);

	let loadNames = $derived(
		generation.seriesNames
			.filter((/** @type {string} */ d) => seriesLoadsIds.includes(d))
			.reverse()
	);

	let energySourcesTotal = $derived(
		generation.hoverData
			? sourceNames.reduce(
					/**
					 * @param {number} acc
					 * @param {string} id
					 */
					(acc, id) => acc + generation.hoverData[id],
					0
				)
			: generation.focusData
				? sourceNames.reduce(
						/**
						 * @param {number} acc
						 * @param {string} id
						 */
						(acc, id) => acc + generation.focusData[id],
						0
					)
				: 0
	);
	let energyLoadsTotal = $derived(
		generation.hoverData
			? loadNames.reduce(
					/**
					 * @param {number} acc
					 * @param {string} id
					 */
					(acc, id) => acc + generation.hoverData[id],
					0
				)
			: generation.focusData
				? loadNames.reduce(
						/**
						 * @param {number} acc
						 * @param {string} id
						 */
						(acc, id) => acc + generation.focusData[id],
						0
					)
				: 0
	);

	let capacitySourcesTotal = $derived(
		capacity.hoverData
			? sourceNames.reduce(
					/**
					 * @param {number} acc
					 * @param {string} id
					 */
					(acc, id) => acc + (capacity.hoverData[capNameMap[id]] || 0),
					0
				)
			: capacity.focusData
				? sourceNames.reduce(
						/**
						 * @param {number} acc
						 * @param {string} id
						 */
						(acc, id) => acc + (capacity.focusData[capNameMap[id]] || 0),
						0
					)
				: 0
	);

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
		return color(colorString).darker(0.5).formatHex();
	}

	// get string before () in label
	/**
	 * @param {string} label
	 */
	function getLabel(label) {
		return label.split(' (')[0];
	}

	// get string inside () in label
	/**
	 * @param {string} label
	 */
	function getSublabel(label) {
		const labelArr = label.split(' (');
		return labelArr.length > 1 ? `(${labelArr[1].slice(0, -1)})` : '';
	}
</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<TableHeader
		showCheckbox={false}
		hoverTime={generation.hoverTime || generation.focusTime}
	/>

	<table class="w-full table-fixed border border-warm-grey mb-8">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[60%] px-2 py-6 text-sm font-medium">
					<div class="flex items-center gap-4">
						<span class="block text-dark-grey text-sm font-medium ml-3">Technology</span>
						<div
							class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap"
						>
							<FormSelect
								paddingY="py-2"
								paddingX="px-4"
								selectedLabelClass="font-medium text-sm"
								options={groupOptions}
								selected={$selectedFuelTechGroup}
								onchange={(option) => ($selectedFuelTechGroup = option.value)}
							/>
						</div>
					</div>
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
					<div class="flex flex-col items-end mr-3">
						<span class="block text-xs">Capacity</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() => capacity.chartOptions.cyclePrefix()}
						>
							{capacity.chartOptions.displayUnit}
						</button>
					</div>
				</th>
			</tr>
		</thead>

		<thead>
			<tr>
				<th class="border-b border-warm-grey px-2 py-1 pt-6 text-sm font-medium text-left">
					<span class="ml-3"> Sources </span>
				</th>
				<th class="border-b border-warm-grey px-2 py-1 pt-6 text-sm font-medium">
					<div class="font-mono flex flex-col items-end">
						{generation.convertAndFormatValue(energySourcesTotal)}
					</div>
				</th>
				<th class="border-b border-warm-grey px-2 py-1 pt-6 text-sm font-medium">
					<div class="font-mono flex flex-col items-end mr-3">
						{capacity.convertAndFormatValue(capacitySourcesTotal)}
					</div>
				</th>
			</tr>
		</thead>

		<tbody>
			{#each sourceNames as name (name)}
				<tr
					onclick={() => handleRowClick(name)}
					class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
					class:opacity-50={hiddenRowNames.includes(name)}
				>
					<td class="px-2 py-1">
						<div class="flex items-center gap-3 ml-3">
							{#if hiddenRowNames.includes(name)}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded-sm bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
								></div>
							{:else}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded-sm"
									style:background-color={generation.seriesColours[name]}
									style:border-color={darken(generation.seriesColours[name])}
								></div>
							{/if}

							<div>
								{getLabel(generation.seriesLabels[name])}
								<span class="text-mid-grey">{getSublabel(generation.seriesLabels[name])}</span>
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
						<div class="font-mono flex flex-col items-end mr-3">
							{capacity.hoverData
								? capacity.convertAndFormatValue(capacity.hoverData[capNameMap[name]])
								: capacity.focusData
									? capacity.convertAndFormatValue(capacity.focusData[capNameMap[name]])
									: ''}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>

		{#if loadNames.length > 0}
			<thead>
				<tr>
					<th class="border-b border-warm-grey px-2 py-1 pt-6 text-sm font-medium text-left">
						<span class="ml-3"> Loads </span>
					</th>
					<th class="border-b border-warm-grey px-2 py-1 pt-6 text-sm font-medium">
						<div class="font-mono flex flex-col items-end">
							{generation.convertAndFormatValue(energyLoadsTotal)}
						</div>
					</th>
					<th class="border-b border-warm-grey px-2 py-1 text-sm font-medium"></th>
				</tr>
			</thead>

			<tbody>
				{#each loadNames as name, i (name)}
					<tr
						onclick={() => handleRowClick(name)}
						class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
						class:opacity-50={hiddenRowNames.includes(name)}
					>
						<td class:!pb-8={i === sourceNames.length - 1} class="px-2 py-1">
							<div class="flex items-center gap-3 ml-3">
								{#if hiddenRowNames.includes(name)}
									<div
										class="w-6 h-6 min-w-6 min-h-6 border rounded-sm bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
									></div>
								{:else}
									<div
										class="w-6 h-6 min-w-6 min-h-6 border rounded-sm"
										style:background-color={generation.seriesColours[name]}
										style:border-color={darken(generation.seriesColours[name])}
									></div>
								{/if}

								<div>
									{getLabel(generation.seriesLabels[name])}
									<span class="text-mid-grey">{getSublabel(generation.seriesLabels[name])}</span>
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
							<div class="font-mono flex flex-col items-end mr-3">
								{capacity.hoverData
									? capacity.convertAndFormatValue(capacity.hoverData[capNameMap[name]])
									: capacity.focusData
										? capacity.convertAndFormatValue(capacity.focusData[capNameMap[name]])
										: ''}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		{/if}

		<tfoot>
			<tr>
				<td class="h-4"></td>
			</tr>
		</tfoot>
	</table>

	<table class="w-full table-fixed border border-warm-grey">
		<thead class="main-thead bg-light-warm-grey border-b border-t border-warm-grey">
			<tr>
				<th class="w-[60%] px-2 py-6 text-sm font-medium text-left">
					<span class="block text-dark-grey text-sm font-semibold ml-3">Impact</span>
				</th>
				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end">
						<span class="block text-xs">Volume</span>
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
		<tbody>
			<tr class="text-sm">
				<th class="px-2 py-6! text-sm font-medium">
					<div class="flex items-center gap-3 ml-3">
						<div
							class="w-6 h-6 min-w-6 min-h-6 border rounded-sm"
							style="background-color: #444444; border-color: {darken('#444444')}"
						></div>
						<span>Emissions</span>
					</div>
				</th>

				<th class="px-2 py-6! text-sm font-medium">
					<div class="font-mono flex flex-col items-end">
						{emissions.hoverData
							? emissions.convertAndFormatValue(emissions.hoverData['au.emissions.total'])
							: emissions.focusData
								? emissions.convertAndFormatValue(emissions.focusData['au.emissions.total'])
								: ''}
					</div>
				</th>
				<th class="px-2 py-6! text-sm font-medium">
					<div class="font-mono flex flex-col items-end mr-3">
						{intensity.hoverData
							? intensity.convertAndFormatValue(intensity.hoverData['au.emission_intensity'])
							: intensity.focusData
								? intensity.convertAndFormatValue(intensity.focusData['au.emission_intensity'])
								: ''}
					</div>
				</th>
			</tr>
		</tbody>
	</table>

	<TableHeader
		showLabel={false}
		includeBatteryAndLoads={$includeBatteryAndLoads}
		onchange={() => ($includeBatteryAndLoads = !$includeBatteryAndLoads)}
	/>

	<AboutData />
</div>
