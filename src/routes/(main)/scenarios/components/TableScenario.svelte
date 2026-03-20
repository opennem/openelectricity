<script>
	import { getContext } from 'svelte';
	import { color } from 'd3-color';
	import { X } from '@lucide/svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import {
		modelScenarioPathwayOptions,
		scenarioLabelMap,
		modelLabelMap
	} from '../page-data-options/models';
	import {
		planOptions,
		getScenarioOptions,
		getPathwayOptions,
		getDefaultScenario,
		getDefaultPathway
	} from '../page-data-options/grouped-options';
	import TableHeader from './TableHeader.svelte';
	import AboutData from './AboutData.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} [hiddenRowNames]
	 * @property {string} [title]
	 * @property {(detail: { name: string, isMetaPressed: boolean, allNames: string[] }) => void} [onrowclick]
	 */

	/** @type {Props} */
	let { hiddenRowNames = [], title = '', onrowclick } = $props();

	const { includeBatteryAndLoads, multiSelectionData } = getContext('scenario-filters');
	const { orderedModelScenarioPathways } = getContext('by-scenario');
	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');

	let showEditor = $state(false);
	let isMetaPressed = false;

	/** Models not already in the current selection */
	let availableModels = $derived(
		planOptions.filter(
			(p) =>
				!$orderedModelScenarioPathways.some(
					(/** @type {any} */ m) => m.model === p.value
				)
		)
	);

	/** Total pathway count — cannot remove the last one */
	let totalPathways = $derived($multiSelectionData.length);

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

	/**
	 * Add a new model with its first scenario and default pathway.
	 * @param {string} modelValue
	 */
	function addModel(modelValue) {
		const scenario = getDefaultScenario(modelValue);
		const pathway = getDefaultPathway(modelValue);
		const id = `${modelValue}-${scenario}-${pathway}`;
		const entry = modelScenarioPathwayOptions.find((/** @type {any} */ m) => m.id === id);
		if (entry) {
			$multiSelectionData = [...$multiSelectionData, entry];
		}
	}

	/**
	 * Add a new scenario under a model with the default pathway.
	 * @param {string} modelValue
	 * @param {string} scenarioValue
	 */
	function addScenario(modelValue, scenarioValue) {
		const pathway = getDefaultPathway(modelValue);
		const id = `${modelValue}-${scenarioValue}-${pathway}`;
		const entry = modelScenarioPathwayOptions.find((/** @type {any} */ m) => m.id === id);
		if (entry) {
			$multiSelectionData = [...$multiSelectionData, entry];
		}
	}

	/**
	 * Add a new pathway under a model/scenario.
	 * @param {string} modelValue
	 * @param {string} scenarioValue
	 * @param {string} pathwayValue
	 */
	function addPathway(modelValue, scenarioValue, pathwayValue) {
		const id = `${modelValue}-${scenarioValue}-${pathwayValue}`;
		const entry = modelScenarioPathwayOptions.find((/** @type {any} */ m) => m.id === id);
		if (entry) {
			$multiSelectionData = [...$multiSelectionData, entry];
		}
	}

	/**
	 * Remove a single pathway by its id.
	 * @param {string} id
	 */
	function removePathway(id) {
		$multiSelectionData = $multiSelectionData.filter((/** @type {any} */ d) => d.id !== id);
	}

	/**
	 * Remove all pathways for a given model + scenario.
	 * @param {string} modelValue
	 * @param {string} scenarioValue
	 */
	function removeScenario(modelValue, scenarioValue) {
		$multiSelectionData = $multiSelectionData.filter(
			(/** @type {any} */ d) => !(d.model === modelValue && d.scenario === scenarioValue)
		);
	}

	/**
	 * Remove all pathways for a given model.
	 * @param {string} modelValue
	 */
	function removeModel(modelValue) {
		$multiSelectionData = $multiSelectionData.filter(
			(/** @type {any} */ d) => d.model !== modelValue
		);
	}

</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<button
			class="text-xs font-medium px-4 py-2 rounded-lg cursor-pointer {showEditor ? 'bg-dark-grey text-white hover:bg-black' : 'border border-mid-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey'}"
			onclick={() => (showEditor = !showEditor)}
		>
			{showEditor ? 'Done' : 'Update'}
		</button>

		<TableHeader
			showCheckbox={false}
			hoverTime={generation.hoverTime || generation.focusTime}
		/>
	</div>

	<table class="w-full border border-warm-grey">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[40%] px-2 text-sm font-medium text-left">
					<div class="flex items-center ml-3" style="min-height: 70px;">
						<span class="text-dark-grey text-sm font-medium">{title}</span>
					</div>
				</th>
				{#if !showEditor}
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
				{/if}
			</tr>
		</thead>

		<tbody>
			<tr>
				<td colspan="5" class="h-4"></td>
			</tr>

			<!-- historical-->
			<tr
				class="hover:bg-light-warm-grey group cursor-pointer text-sm"
				onclick={() => handleRowClick('historical')}
				class:opacity-50={hiddenRowNames.includes('historical')}
			>
				<td class="px-2 py-1 align-top">
					<div class="flex items-center gap-3 ml-3">
						{#if hiddenRowNames.includes('historical')}
							<div
								class="w-6 h-6 min-w-6 min-h-6 border rounded-sm bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
							></div>
						{:else}
							<div
								class="w-6 h-6 min-w-6 min-h-6 border rounded-sm"
								style:background-color={generation.seriesColours['historical']}
								style:border-color={darken(generation.seriesColours['historical'])}
							></div>
						{/if}
						<div>Historical</div>
					</div>
				</td>

				{#if !showEditor}
					<td class="px-2 py-1 align-top">
						<div class="font-mono flex flex-col items-end">
							{generation.hoverData
								? generation.convertAndFormatValue(generation.hoverData['historical'])
								: generation.focusData
									? generation.convertAndFormatValue(generation.focusData['historical'])
									: ''}
						</div>
					</td>

					<td class="px-2 py-1 align-top">
						<div class="font-mono flex flex-col items-end">
							{capacity.hoverData
								? capacity.convertAndFormatValue(capacity.hoverData['historical'])
								: capacity.focusData
									? capacity.convertAndFormatValue(capacity.focusData['historical'])
									: ''}
						</div>
					</td>

					<td class="px-2 py-1 align-top">
						<div class="font-mono flex flex-col items-end">
							{emissions.hoverData
								? emissions.convertAndFormatValue(emissions.hoverData['historical'])
								: emissions.focusData
									? emissions.convertAndFormatValue(emissions.focusData['historical'])
									: ''}
						</div>
					</td>
					<td class="px-2 py-1 align-top">
						<div class="font-mono flex flex-col items-end mr-3">
							{intensity.hoverData
								? intensity.convertAndFormatValue(intensity.hoverData['historical'])
								: intensity.focusData
									? intensity.convertAndFormatValue(intensity.focusData['historical'])
									: ''}
						</div>
					</td>
				{/if}
			</tr>

			<tr>
				<td colspan="5" class="h-4"></td>
			</tr>
		</tbody>

		<tbody class="border-b border-warm-grey">
			{#each $orderedModelScenarioPathways as { model, scenarios } (model)}
				{@const existingScenarioIds = scenarios.map((/** @type {any} */ s) => s.scenario)}
				{@const availableScenarios = getScenarioOptions(model).filter(
					(s) => !existingScenarioIds.includes(s.value)
				)}

				<tr>
					<th colspan={showEditor ? 1 : 5} class="pb-0 align-top text-left px-2 pt-1 font-medium">
						<div class="flex items-center justify-between ml-3 mb-0 pb-2 border-b border-warm-grey mr-3">
							<h6 class="mb-0">{modelLabelMap[model]}</h6>
							{#if showEditor}
								<button
									class="w-7 h-7 border border-warm-grey rounded-sm flex items-center justify-center text-mid-grey hover:text-dark-grey hover:border-mid-grey cursor-pointer"
									onclick={() => removeModel(model)}
									aria-label="Remove model {modelLabelMap[model]}"
								>
									<X class="size-3.5" />
								</button>
							{/if}
						</div>
					</th>
				</tr>

				{#each scenarios as { scenario, pathways } (scenario)}
					{@const scenarioId = `${model}-${scenario}`}
					{@const existingPathways = pathways}
					{@const availablePathways = getPathwayOptions(model).filter(
						(p) => !existingPathways.includes(p.value)
					)}

					<tr>
						<td colspan={showEditor ? 1 : 5} class="pb-0! align-top">
							<div class="flex items-center justify-between ml-5 mt-3 mr-5">
								<span class="block font-space text-xs">
									{scenarioLabelMap[scenarioId] || ''}
								</span>
								{#if showEditor}
									<button
										class="w-7 h-7 border border-warm-grey rounded-sm flex items-center justify-center text-mid-grey hover:text-dark-grey hover:border-mid-grey cursor-pointer"
										onclick={() => removeScenario(model, scenario)}
										aria-label="Remove scenario {scenarioLabelMap[scenarioId] || scenario}"
									>
										<X class="size-3.5" />
									</button>
								{/if}
							</div>
						</td>
					</tr>
					{#each pathways as pathway (pathway)}
						{@const id = `${model}-${scenario}-${pathway}`}
						<tr
							class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-1"
							onclick={() => handleRowClick(id)}
							class:opacity-50={hiddenRowNames.includes(id)}
						>
							<td class="px-2 py-1 align-top">
								<div class="flex items-center gap-3 ml-3 mr-3">
									{#if hiddenRowNames.includes(id)}
										<div
											class="w-6 h-6 min-w-6 min-h-6 border rounded-sm bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
										></div>
									{:else}
										<div
											class="w-6 h-6 min-w-6 min-h-6 border rounded-sm"
											style:background-color={generation.seriesColours[id]}
											style:border-color={darken(generation.seriesColours[id])}
										></div>
									{/if}
									<div class="text-mid-grey font-normal block flex-1">{pathway}</div>
									{#if showEditor}
										<button
											class="w-7 h-7 border border-warm-grey rounded-sm flex items-center justify-center text-mid-grey hover:text-dark-grey hover:border-mid-grey cursor-pointer {totalPathways > 1 ? '' : 'invisible'}"
											onclick={(e) => { e.stopPropagation(); removePathway(id); }}
											aria-label="Remove pathway {pathway}"
											disabled={totalPathways <= 1}
										>
											<X class="size-3.5" />
										</button>
									{/if}
								</div>
							</td>

							{#if !showEditor}
								<td class="px-2 py-1 align-top">
									<div class="font-mono flex flex-col items-end">
										{generation.hoverData
											? generation.convertAndFormatValue(generation.hoverData[id])
											: generation.focusData
												? generation.convertAndFormatValue(generation.focusData[id])
												: ''}
									</div>
								</td>

								<td class="px-2 py-1 align-top">
									<div class="font-mono flex flex-col items-end">
										{capacity.hoverData
											? capacity.convertAndFormatValue(capacity.hoverData[id])
											: capacity.focusData
												? capacity.convertAndFormatValue(capacity.focusData[id])
												: ''}
									</div>
								</td>

								<td class="px-2 py-1 align-top">
									<div class="font-mono flex flex-col items-end">
										{emissions.hoverData
											? emissions.convertAndFormatValue(emissions.hoverData[id])
											: emissions.focusData
												? emissions.convertAndFormatValue(emissions.focusData[id])
												: ''}
									</div>
								</td>
								<td class="px-2 py-1 align-top">
									<div class="font-mono flex flex-col items-end mr-3">
										{intensity.hoverData
											? intensity.convertAndFormatValue(intensity.hoverData[id])
											: intensity.focusData
												? intensity.convertAndFormatValue(intensity.focusData[id])
												: ''}
									</div>
								</td>
							{/if}
						</tr>
					{/each}

					{#if showEditor && availablePathways.length > 0}
						<tr>
							<td class="px-2 py-1 pl-5">
								<div class="inline-block border border-warm-grey rounded-lg">
									<FormSelect
										formLabel="Add Pathway"
										options={availablePathways}
										selected=""
										paddingX="px-2"
										paddingY="py-1"
										selectedLabelClass="text-xs text-mid-grey"
										onchange={(option) => {
											addPathway(model, scenario, /** @type {string} */ (option.value));
										}}
									/>
								</div>
							</td>
						</tr>
					{/if}
				{/each}

				{#if showEditor && availableScenarios.length > 0}
					<tr>
						<td class="px-2 pt-3 py-1 pl-5">
							<div class="inline-block border border-warm-grey rounded-lg">
								<FormSelect
									formLabel="Add Scenario"
									options={availableScenarios}
									selected=""
									paddingX="px-2"
									paddingY="py-1"
									selectedLabelClass="text-xs text-mid-grey"
									onchange={(option) => {
										addScenario(model, /** @type {string} */ (option.value));
									}}
								/>
							</div>
						</td>
					</tr>
				{/if}

				<tr>
					<td colspan="5" class="h-4"></td>
				</tr>
			{/each}

			{#if showEditor && availableModels.length > 0}
				<tr>
					<td class="px-2 py-1 pb-3 pl-5 border-t border-warm-grey">
						<div class="inline-block border border-warm-grey rounded-lg mt-2">
							<FormSelect
								formLabel="Add Model"
								options={availableModels}
								selected=""
								paddingX="px-2"
								paddingY="py-1"
								selectedLabelClass="text-xs text-mid-grey"
								onchange={(option) => {
									addModel(/** @type {string} */ (option.value));
								}}
							/>
						</div>
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
	<TableHeader
		showLabel={false}
		includeBatteryAndLoads={$includeBatteryAndLoads}
		onchange={() => ($includeBatteryAndLoads = !$includeBatteryAndLoads)}
	/>

	<AboutData />
</div>
