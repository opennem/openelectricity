<script>
	import { modelOptions, scenarioOptions, defaultModelPathway } from '../page-data-options/models';
	import PathwaySelection from './PathwaySelection.svelte';
	import ScenarioButton from './ScenarioButton.svelte';

	/** @typedef {{model: string, scenario: string, pathway: string}} ScenarioSelect */

	/** @type {'radio' | 'checkbox'} */
	export let selectionMode = 'radio';

	/** @type {ScenarioSelect} */
	let radioData = {
		model: '',
		scenario: '',
		pathway: ''
	};
	/** @type {ScenarioSelect[]} */
	let checkboxData = [];

	/** @type {string[]} */
	let selectedScenarios = [];
	/** @type {string | null} */
	let focusScenarioId = null;

	let scenariosPathways = scenarioOptions.map((s) => ({
		id: s.id,
		value: s.value,
		model: s.model,
		pathway: defaultModelPathway[s.model]
	}));

	$: isRadioMode = selectionMode === 'radio';
	$: scenarioPathway = scenariosPathways.find((s) => s.id === focusScenarioId);
	$: focusScenario = scenarioOptions.find((s) => s.id === focusScenarioId);
	$: focusScenarioModel = focusScenario
		? modelOptions.find((m) => m.value === focusScenario.model)
		: null;
	$: focusPathways = focusScenarioModel ? focusScenarioModel.pathways : [];

	// $: console.log('focusScenario', focusScenario);
	// $: console.log('focusScenarioModel', focusScenarioModel);
	// $: console.log('focusPathways', focusPathways);

	$: {
		// update radioData
		if (scenarioPathway) {
			radioData = {
				model: scenarioPathway.model,
				scenario: scenarioPathway.value,
				pathway: scenarioPathway.pathway
			};
		}
	}

	$: {
		// update checkboxData
		checkboxData = selectedScenarios.map((id) => {
			const find = scenariosPathways.find((s) => s.id === id);
			return {
				model: find.model,
				scenario: find.value,
				pathway: find.pathway
			};
		});
	}

	$: console.log('radioData', radioData);
	$: console.log('checkboxData', checkboxData);

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
	}

	/**
	 *
	 * @param {string | null} id
	 * @param {string} pathway
	 */
	function handlePathwayChange(id, pathway) {
		const scenarioPathway = scenariosPathways.find((s) => s.id === id);
		scenarioPathway.pathway = pathway;

		scenariosPathways = [...scenariosPathways];
	}
</script>

<div class="border-t border-warm-grey">
	<div class="grid grid-cols-3 divide-x divide-warm-grey px-6">
		<div class="p-12 pl-0 col-span-2">
			{#each modelOptions as model}
				<div class="pb-6">
					<h5 class="font-space uppercase text-sm text-mid-grey">{model.label}</h5>
					<ul class="grid grid-cols-4 gap-3">
						{#each model.scenarios as scenario}
							{@const isFocussed = focusScenarioId === scenario.id}
							{@const isChecked = selectedScenarios.includes(scenario.id)}
							<li>
								<ScenarioButton
									{model}
									{scenario}
									{isRadioMode}
									{isChecked}
									highlightBg={isRadioMode ? isFocussed : isChecked}
									highlightBorder={isFocussed}
									on:click={() => (focusScenarioId = scenario.id)}
									on:change={(evt) => handleCheckBoxChange(scenario.id, evt.detail.checked)}
								/>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
		<div class="p-12 pr-0">
			{#if focusScenarioId}
				<PathwaySelection
					pathways={focusPathways}
					selectedScenario={focusScenario}
					selectedPathway={scenarioPathway.pathway}
					on:change={(evt) => handlePathwayChange(focusScenarioId, evt.detail.value)}
				/>
			{/if}
		</div>
	</div>
</div>
