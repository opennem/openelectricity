<script>
	import { getContext, onMount } from 'svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { scenarioLabels, scenarioDescriptions } from './descriptions';
	import { allScenarios, modelOptions } from './options';

	const { selectedModel, selectedScenario, selectedPathway, selectedMultipleScenarios } =
		getContext('scenario-filters');

	/** @type {'single' | 'multiple'} */
	export let selectionMode = 'single';
	/** @type {*} */
	let focusScenario = null;
	/** @type {*} */
	let focusPathway = null;
	/** @type {string[]} */
	let selectedScenarios = [];
	/** @type {*[]} */
	let selectedScenariosPathways = allScenarios.map((scenario) => ({
		id: scenario.id,
		pathway: scenario.defaultPathway
	}));

	const modelFilterOptions = [
		{
			value: 'all',
			label: 'All models'
		},
		...modelOptions
	];
	let filterModel = 'all';

	$: isSingleSelectionMode = selectionMode === 'single';
	$: filteredScenarios =
		filterModel === 'all'
			? allScenarios
			: allScenarios.filter((scenario) => scenario.model === filterModel);

	onMount(() => {
		console.log('selectedModel, selectedScenario, selectedPathway, selectedMultipleScenarios', {
			$selectedModel,
			$selectedScenario,
			$selectedPathway,
			$selectedMultipleScenarios
		});

		const findScenario = allScenarios.find(
			(s) => s.model === $selectedModel && s.scenarioId === $selectedScenario
		);

		focusPathway = $selectedPathway;

		if (findScenario) {
			focusScenario = { ...findScenario };
		}

		selectedScenarios = $selectedMultipleScenarios.map((s) => s.model + '-' + s.scenario);

		selectedScenariosPathways = $selectedMultipleScenarios.map((s) => ({
			id: s.model + '-' + s.scenario,
			pathway: s.pathway
		}));
	});

	/**
	 * @param {string} model
	 * @param {string} scenario
	 * @param {string} pathway
	 */
	function updateData(model, scenario, pathway) {
		console.log('updateData', model, scenario, pathway);

		$selectedModel = model;
		$selectedScenario = scenario;
		$selectedPathway = pathway;
	}

	function updateMultipleScenariosSelection() {
		const updated = selectedScenarios.map((id) => {
			const scenarioPathway = selectedScenariosPathways.find((s) => s.id === id);
			const scenario = allScenarios.find((s) => s.id === id);
			const pathway = scenarioPathway ? scenarioPathway.pathway : scenario?.defaultPathway;
			return {
				id: scenario?.id + '-' + pathway.toLowerCase().split(' ').join('_'),
				pathway: pathway,
				model: scenario?.model,
				scenario: scenario?.scenarioId,
				colour: scenario?.colour
			};
		});

		console.log('updateMultipleScenariosSelection', updated);
		$selectedMultipleScenarios = updated;
		selectedScenariosPathways = updated.map((s) => ({
			id: s.model + '-' + s.scenario,
			pathway: s.pathway
		}));
	}

	/**
	 *
	 * @param {string} selected
	 * @param {Boolean} checked
	 */
	function handleCheckBoxChange(selected, checked) {
		if (checked) {
			selectedScenarios = [...selectedScenarios, selected];
		} else {
			selectedScenarios = selectedScenarios.filter((scenario) => scenario !== selected);
		}

		updateMultipleScenariosSelection();
	}

	/**
	 *
	 * @param {string }id
	 * @param {string} pathway
	 */
	function handlePathwayChange(id, pathway) {
		focusPathway = pathway;

		const scenario = selectedScenariosPathways.find((scenario) => scenario.id === id);

		if (scenario) {
			scenario.pathway = pathway;
			selectedScenariosPathways = [...selectedScenariosPathways];
		}

		if (isSingleSelectionMode && focusScenario) {
			updateData(focusScenario.model, focusScenario.scenarioId, pathway);
		} else {
			updateData(focusScenario.model, focusScenario.scenarioId, pathway);
			updateMultipleScenariosSelection();
		}
	}

	/**
	 *
	 * @param {string }id
	 */
	function handleFocusScenarioChange(id) {
		const scenario = allScenarios.find((scenario) => scenario.id === id);
		focusScenario = { ...scenario };

		// updated selected scenarios pathways
		// const scenarioPathway = selectedScenariosPathways.find((scenario) => scenario.id === id);

		if (focusScenario && focusPathway) {
			const isPathwayInScenario = focusScenario.pathways.find((p) => p === focusPathway);

			if (!isPathwayInScenario) {
				focusPathway = focusScenario.defaultPathway;
			}

			updateData(focusScenario.model, focusScenario.scenarioId, focusPathway);
		}
	}

	$: focusScenarioId = focusScenario?.id || null;

	$: getPathway = () => {
		const scenario = selectedScenariosPathways.find(
			(scenario) => scenario.id === focusScenario?.id
		);
		return scenario ? scenario.pathway : focusScenario?.defaultPathway;
	};

	$: focusScenarioPathways = focusScenario?.pathways || [];
</script>

<div class="border-b border-t border-warm-grey">
	<div class="max-w-none container grid grid-cols-3 divide-x divide-warm-grey">
		<div class="p-12 pl-0 col-span-2">
			<header class="flex justify-between items-center mb-6">
				<h5 class="font-space uppercase text-sm text-mid-grey">
					{#if !isSingleSelectionMode}Current{/if} Scenarios
				</h5>

				<div class="border border-mid-warm-grey text-sm inline-block rounded-md">
					<FormSelect
						paddingY="py-2"
						paddingX="px-4"
						options={modelFilterOptions}
						selected={filterModel}
						on:change={(evt) => (filterModel = evt.detail.value)}
					/>
				</div>
			</header>

			<ul class="grid grid-cols-4 gap-3">
				{#each filteredScenarios as { id, organisation, year, scenario, draft, pathways, defaultPathway }}
					<li>
						<button
							class="min-h-36 text-left w-full border rounded-lg p-4 grid grid-cols-1 gap-6 place-content-between hover:border-black"
							class:bg-light-warm-grey={isSingleSelectionMode
								? focusScenarioId === id
								: selectedScenarios.includes(id)}
							class:border-black={focusScenarioId === id}
							class:border-warm-grey={focusScenarioId !== id}
							on:click={() => handleFocusScenarioChange(id)}
						>
							{#if isSingleSelectionMode}
								<div
									class="flex justify-between items-start text-sm font-semibold text-dark-grey gap-3"
								>
									<span>{scenario}</span>
									<RadioBigButton
										radioOnly={true}
										name="peak_low"
										label={scenario}
										value={'12'}
										checked={focusScenarioId === id}
									/>
								</div>
							{:else}
								<Checkbox
									label={scenario}
									checked={selectedScenarios.includes(id)}
									class="w-full justify-between !items-start flex-row-reverse text-sm font-semibold text-dark-grey"
									on:change={(evt) => handleCheckBoxChange(id, evt.detail.checked)}
								/>
							{/if}

							<!-- <div class="border border-mid-grey text-xs inline-block rounded-md">
								<FormSelect
									options={pathways.map((pathway) => ({ value: pathway, label: pathway }))}
									selected={getPathway(id, defaultPathway)}
									on:change={(evt) => handlePathwayChange(id, evt.detail.value)}
								/>
							</div> -->

							<div class="flex justify-between text-xs">
								<div>
									{year}
									{#if draft}
										<span>Draft</span>
									{/if}
								</div>

								<span>{organisation}</span>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<div class="p-12 pr-0">
			{#if focusScenario}
				<h6 class="text-mid-grey">
					{scenarioLabels[focusScenario.model][focusScenario.scenarioId]}
				</h6>
				<p class="text-sm my-6">
					{scenarioDescriptions[focusScenario.model][focusScenario.scenarioId]}
				</p>

				<div class="border border-mid-grey text-sm inline-block rounded-md">
					<FormSelect
						paddingY="py-3"
						paddingX="px-4"
						options={focusScenarioPathways.map((pathway) => ({ value: pathway, label: pathway }))}
						selected={isSingleSelectionMode ? focusPathway : getPathway()}
						on:change={(evt) => handlePathwayChange(focusScenarioId, evt.detail.value)}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
