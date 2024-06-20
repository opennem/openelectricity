<script>
	import { getContext } from 'svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { scenarioLabels, scenarioDescriptions } from './descriptions';
	import { allScenarios } from './options';

	/** @type {'single' | 'multiple'} */
	export let selectionMode = 'single';
	/** @type {*} */
	let focusScenario = null;
	/** @type {string[]} */
	let selectedScenarios = [];
	/** @type {*[]} */
	let selectedScenariosPathways = allScenarios.map((scenario) => ({
		id: scenario.id,
		pathway: scenario.defaultPathway
	}));

	$: isSingleSelectionMode = selectionMode === 'single';

	/**
	 *
	 * @param {string} selected
	 * @param {Boolean} checked
	 */
	function handleCheckBoxChange(selected, checked) {
		console.log('handleCheckBoxChange', selected, checked);

		if (checked) {
			selectedScenarios = [...selectedScenarios, selected];
		} else {
			selectedScenarios = selectedScenarios.filter((scenario) => scenario !== selected);
		}

		console.log('selectedScenarios', selectedScenarios);
	}

	function handleRadioChange(selected, checked) {
		console.log('handleRadioChange', selected, checked);
	}

	/**
	 *
	 * @param {string }id
	 * @param {string} defaultPathway
	 */

	function handlePathwayChange(id, pathway) {
		console.log('handlePathwayChange', id, pathway);
		const scenario = selectedScenariosPathways.find((scenario) => scenario.id === id);
		scenario.pathway = pathway;

		selectedScenariosPathways = [...selectedScenariosPathways];
	}

	function handleFocusScenarioChange(id) {
		console.log('handleFocusScenarioChange', id);
		const scenario = allScenarios.find((scenario) => scenario.id === id);
		focusScenario = scenario;
	}

	$: focusScenarioId = focusScenario?.id || null;

	$: getPathway =
		/**
		 *
		 * @param {string} id
		 * @param {string} defaultPathway
		 */
		(id, defaultPathway) => {
			const scenario = selectedScenariosPathways.find((scenario) => scenario.id === id);
			return scenario ? scenario.pathway : defaultPathway;
		};

	$: focusScenarioPathways = focusScenario?.pathways || [];
</script>

<div class="border-b border-t border-warm-grey">
	<div class="max-w-none container grid grid-cols-3 divide-x divide-warm-grey">
		<div class="p-12 pl-0 col-span-2">
			<h5>Current Scenarios</h5>

			<ul class="grid grid-cols-4 gap-3">
				{#each allScenarios as { id, organisation, year, scenario, draft, pathways, defaultPathway }}
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
								<div class="flex justify-between items-center text-sm">
									<span>{scenario}</span>
									<RadioBigButton
										radioOnly={true}
										name="peak_low"
										label={scenario}
										value={'12'}
										changeHandler={(evt) => handleRadioChange(id, evt.detail.checked)}
										checked={focusScenarioId === id}
									/>
								</div>
							{:else}
								<Checkbox
									label={scenario}
									checked={selectedScenarios.includes(id)}
									class="w-full justify-between items-center flex-row-reverse text-sm"
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
						selected={getPathway(focusScenarioId, focusScenario?.defaultPathway)}
						on:change={(evt) => handlePathwayChange(focusScenarioId, evt.detail.value)}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
