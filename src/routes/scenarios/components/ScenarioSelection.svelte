<script>
	import { getContext, onMount } from 'svelte';
	import { modelOptions, scenarioOptions, defaultModelPathway } from '../page-data-options/models';
	import PathwaySelection from './PathwaySelection.svelte';
	import ScenarioButton from './ScenarioButton.svelte';

	const { singleSelectionData, multiSelectionData, isSingleSelectionMode } =
		getContext('scenario-filters');

	export let mobileView = false;

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

	// $: console.log('singleSelectionData', $singleSelectionData);
	// $: console.log('multiSelectionData', $multiSelectionData);

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
</script>

<div class="grid grid-cols-1 md:grid-cols-3 divide-x divide-warm-grey md:border-b border-warm-grey">
	<div class="p-0 md:p-16 col-span-2">
		{#each modelOptions as model, i}
			<div class:pb-8={i === 0}>
				<h5
					class="font-space uppercase text-sm text-mid-grey px-10 py-2 mb-0 md:pb-2 md:pl-1 text-right border-y border-warm-grey md:border-0 md:text-left"
				>
					{model.label}
				</h5>
				<ul class="grid grid-cols-1 md:grid-cols-4 md:gap-3">
					{#each model.scenarios as scenario}
						{@const isFocussed = focusScenarioId === scenario.id}
						{@const isChecked = selectedScenarios.includes(scenario.id)}
						<li
							class:bg-light-warm-grey={isFocussed}
							class="border-b border-warm-grey px-6 last:border-0 md:border-0 md:px-0"
						>
							<ScenarioButton
								{model}
								{scenario}
								isRadioMode={$isSingleSelectionMode}
								{isChecked}
								highlightBg={$isSingleSelectionMode ? isFocussed : isChecked}
								highlightBorder={isFocussed}
								on:click={() => handleScenarioButtonClick(scenario.id)}
								on:change={(evt) => handleCheckBoxChange(scenario.id, evt.detail.checked)}
							>
								{#if mobileView && isFocussed}
									<div>
										<PathwaySelection
											showTitle={false}
											position="top"
											align="right"
											pathways={focusPathways}
											selectedScenario={focusScenario}
											selectedPathway={$singleSelectionData?.pathway}
											on:change={(evt) => handlePathwayChange(focusScenarioId, evt.detail.value)}
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
					pathways={focusPathways}
					selectedScenario={focusScenario}
					selectedPathway={$singleSelectionData?.pathway}
					on:change={(evt) => handlePathwayChange(focusScenarioId, evt.detail.value)}
				/>
			{/if}
		</div>
	{/if}
</div>
