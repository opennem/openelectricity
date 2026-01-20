<script>
	import { getContext, onMount } from 'svelte';
	import {
		modelOptions,
		scenarioOptions,
		modelScenarioPathwayOptions,
		defaultModelPathway
	} from '../page-data-options/models';
	import PathwaySelection from './PathwaySelection.svelte';
	import ScenarioButton from './ScenarioButton.svelte';

	const { singleSelectionData, multiSelectionData, isSingleSelectionMode } =
		getContext('scenario-filters');

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [mobileView]
	 */

	/** @type {Props} */
	let { mobileView = false } = $props();

	/** @type {string[]} */
	let selectedScenarios = $state([]);
	/** @type {string | null} */
	let focusScenarioId = $state(null);
	/** @type {ScenarioPathway[]} */
	let scenariosPathways = scenarioOptions.map((/**@type {*} */ s) => ({
		id: s.id,
		value: s.value,
		model: s.model,
		pathway: defaultModelPathway[s.model]
	}));

	onMount(() => {
		// update checkboxes and relevant pathways
		selectedScenarios = [...new Set($multiSelectionData.map((s) => `${s.model}-${s.scenario}`))];

		// update focus/radio selection
		focusScenarioId = $singleSelectionData.id;
	});

	let focusScenario = $derived(
		scenarioOptions.find((/**@type {*} */ s) => s.id === focusScenarioId)
	);
	let focusScenarioModel = $derived(
		focusScenario ? modelOptions.find((m) => m.value === focusScenario.model) : null
	);
	let focusPathways = $derived(focusScenarioModel ? focusScenarioModel.pathways : []);

	let selectedPathways = $derived(
		focusScenarioId
			? $multiSelectionData
					.filter((d) => d.model === focusScenario.model && d.scenario === focusScenario.value)
					.map((d) => d.pathway)
			: []
	);

	// $: console.log('selectedPathways', selectedPathways);
	// $: console.log('focusScenarioModel', focusScenarioModel);
	// $: console.log('focusPathways', focusPathways);

	// $: console.log('singleSelectionData', $singleSelectionData);

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
			const newScenarioPathway = {
				id: `${selected}-${defaultModelPathway[focusScenario.model]}`,
				model: focusScenario.model,
				scenario: focusScenario.value,
				pathway: defaultModelPathway[focusScenario.model]
			};
			selectedScenarios = [...selectedScenarios, selected];
			$multiSelectionData = [...$multiSelectionData, newScenarioPathway];
		} else {
			selectedScenarios = selectedScenarios.filter((scenario) => scenario !== selected);
			// update multiSelectionData
			$multiSelectionData = $multiSelectionData.filter((s) =>
				selectedScenarios.includes(`${s.model}-${s.scenario}`)
			);
		}
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

	/**
	 *
	 * @param {string | null} id
	 * @param {string[]} pathways
	 */
	function handlePathwaysChange(id, pathways) {
		// make sure it has at least one entry in multiSelectionData (aka checked) before adding
		if (!$multiSelectionData.find((s) => `${s.model}-${s.scenario}` === id)) return;

		const scenarioPathways = pathways.map((pathway) =>
			modelScenarioPathwayOptions.find((d) => d.id === `${id}-${pathway}`)
		);
		const filtered = $multiSelectionData.filter((s) => `${s.model}-${s.scenario}` !== id);

		$multiSelectionData = [...filtered, ...scenarioPathways];
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-3 divide-x divide-warm-grey md:border-b border-warm-grey">
	<div class="p-0 md:p-16 col-span-2">
		{#each modelOptions as model, i (model.value)}
			<div class:pb-8={i === 0}>
				<h5
					class="font-space uppercase text-sm text-mid-grey px-10 py-2 mb-0 md:pb-2 md:pl-1 text-right border-y border-warm-grey md:border-0 md:text-left"
				>
					{model.label}
				</h5>
				<ul class="grid grid-cols-1 md:grid-cols-4 md:gap-3">
					{#each model.scenarios as scenario (scenario.id)}
						{@const isFocussed = focusScenarioId === scenario.id}
						{@const isChecked = selectedScenarios.includes(scenario.id)}
						<li class="border-b border-warm-grey px-6 last:border-0 md:border-0 md:px-0">
							<ScenarioButton
								{model}
								{scenario}
								isRadioMode={$isSingleSelectionMode}
								{isChecked}
								highlightBg={$isSingleSelectionMode ? isFocussed : isChecked}
								highlightBorder={isFocussed}
								onclick={() => handleScenarioButtonClick(scenario.id)}
								onchange={(checked) => handleCheckBoxChange(scenario.id, checked)}
							>
								{#if mobileView && isFocussed}
									<div>
										<PathwaySelection
											showTitle={false}
											position="top"
											align="right"
											isRadioMode={$isSingleSelectionMode}
											pathways={focusPathways}
											selectedScenario={focusScenario}
											selectedPathway={$singleSelectionData?.pathway}
											{selectedPathways}
											onchange={(value) => handlePathwayChange(focusScenarioId, value)}
											onchangemultiple={(values) => handlePathwaysChange(focusScenarioId, values)}
										/>
									</div>
								{/if}
							</ScenarioButton>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
	{#if !mobileView}
		<div class="p-10 md:p-16">
			{#if focusScenarioId}
				<PathwaySelection
					isRadioMode={$isSingleSelectionMode}
					pathways={focusPathways}
					selectedScenario={focusScenario}
					selectedPathway={$singleSelectionData?.pathway}
					{selectedPathways}
					onchange={(value) => handlePathwayChange(focusScenarioId, value)}
					onchangemultiple={(values) => handlePathwaysChange(focusScenarioId, values)}
				/>
			{/if}
		</div>
	{/if}
</div>
