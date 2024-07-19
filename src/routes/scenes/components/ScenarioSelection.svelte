<script>
	import { getContext, onMount } from 'svelte';
	import { modelOptions, scenarioOptions, defaultModelPathway } from '../page-data-options/models';
	import PathwaySelection from './PathwaySelection.svelte';
	import ScenarioButton from './ScenarioButton.svelte';

	const { singleSelectionData, multiSelectionData, isSingleSelectionMode } =
		getContext('scenario-filters');

	/** @type {string[]} */
	let selectedScenarios = [];
	/** @type {string | null} */
	let focusScenarioId = null;
	/** @type {ScenarioPathway[]} */
	let scenariosPathways = scenarioOptions.map((/**@type {*} */ s) => ({
		id: s.id,
		value: s.value,
		model: s.model,
		pathway: defaultModelPathway[s.model]
	}));

	onMount(() => {
		// update checkboxes and relevant pathways
		selectedScenarios = $multiSelectionData.map((s) => s.id);
		$multiSelectionData.forEach((s) => {
			const find = scenariosPathways.find((sp) => sp.id === s.id);
			if (find) {
				find.pathway = s.pathway;
			}
		});

		// update focus/radio selection
		focusScenarioId = $singleSelectionData.id;
	});

	$: focusScenario = scenarioOptions.find((/**@type {*} */ s) => s.id === focusScenarioId);
	$: focusScenarioModel = focusScenario
		? modelOptions.find((m) => m.value === focusScenario.model)
		: null;
	$: focusPathways = focusScenarioModel ? focusScenarioModel.pathways : [];

	// $: console.log('focusScenario', focusScenario);
	// $: console.log('focusScenarioModel', focusScenarioModel);
	// $: console.log('focusPathways', focusPathways);

	$: console.log('singleSelectionData', $singleSelectionData);
	$: console.log('multiSelectionData', $multiSelectionData);

	/**
	 * @param {string} id
	 */
	function handleScenarioButtonClick(id) {
		const scenarioPathway = scenariosPathways.find((s) => s.id === id);
		focusScenarioId = id;

		// update singleSelectionData
		if (scenarioPathway) {
			$singleSelectionData = {
				id: scenarioPathway.id,
				model: scenarioPathway.model,
				scenario: scenarioPathway.value,
				pathway: scenarioPathway.pathway
			};
		}
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

		// update multiSelectionData
		$multiSelectionData = selectedScenarios.map((id) => {
			const find = scenariosPathways.find((s) => s.id === id);
			return {
				id: find?.id,
				model: find?.model,
				scenario: find?.value,
				pathway: find?.pathway
			};
		});
	}

	/**
	 *
	 * @param {string | null} id
	 * @param {string} pathway
	 */
	function handlePathwayChange(id, pathway) {
		const scenarioPathway = scenariosPathways.find((s) => s.id === id);
		if (!scenarioPathway) return;

		scenarioPathway.pathway = pathway;
		scenariosPathways = [...scenariosPathways];

		$singleSelectionData = {
			id: scenarioPathway.id,
			model: scenarioPathway.model,
			scenario: scenarioPathway.value,
			pathway: scenarioPathway.pathway
		};
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
									isRadioMode={$isSingleSelectionMode}
									{isChecked}
									highlightBg={$isSingleSelectionMode ? isFocussed : isChecked}
									highlightBorder={isFocussed}
									on:click={() => handleScenarioButtonClick(scenario.id)}
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
					selectedPathway={$singleSelectionData?.pathway}
					on:change={(evt) => handlePathwayChange(focusScenarioId, evt.detail.value)}
				/>
			{/if}
		</div>
	</div>
</div>
