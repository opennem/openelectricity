<script>
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';

	import { scenarioLabels, scenarioDescriptions } from '../page-data-options/descriptions';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [isRadioMode]
	 * @property {*} [selectedScenario]
	 * @property {string} [selectedPathway]
	 * @property {string[]} [pathways]
	 * @property {boolean} [showTitle]
	 * @property {boolean} [showDescription]
	 * @property {string} [position]
	 * @property {string} [align]
	 * @property {*} [selectedPathways]
	 * @property {(value: string) => void} [onchange]
	 * @property {(values: string[]) => void} [onchangemultiple]
	 */

	/** @type {Props} */
	let {
		isRadioMode = false,
		selectedScenario = null,
		selectedPathway = '',
		pathways = [],
		showTitle = true,
		showDescription = true,
		position = 'bottom',
		align = 'left',
		selectedPathways = [],
		onchange,
		onchangemultiple
	} = $props();

	/**
	 * @param {{label: string, value: string | number | null | undefined}} option
	 */
	function handlePathwayChange(option) {
		onchange?.(/** @type {string} */ (option.value));
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handlePathwaysChange(value, isMetaPressed) {
		let updated = [];

		if (isMetaPressed) {
			updated = [value];
		} else if (selectedPathways.includes(value)) {
			const filtered = selectedPathways.filter(
				(/** @type {string} */ pathway) => pathway !== value
			);
			updated = filtered.length === 0 ? [value] : filtered;
		} else {
			updated = [...selectedPathways, value];
		}
		onchangemultiple?.(updated);
	}

	let options = $derived(pathways.map((pathway) => ({ value: pathway, label: pathway })));
</script>

{#if showTitle}
	<h6 class="text-mid-grey">
		{scenarioLabels[selectedScenario.model][selectedScenario.value]}
	</h6>
{/if}
{#if showDescription}
	<p class="text-sm md:my-6">
		{scenarioDescriptions[selectedScenario.model][selectedScenario.value]}
	</p>
{/if}

<div class="flex" class:justify-end={align === 'right'}>
	{#if isRadioMode}
		<div class="border border-mid-grey text-sm inline-block rounded-md">
			<FormSelect
				paddingY="py-3"
				paddingX="px-4"
				{position}
				{align}
				{options}
				selected={selectedPathway}
				onchange={handlePathwayChange}
			/>
		</div>
	{:else}
		<div class="border border-mid-grey text-sm inline-block rounded-md">
			<FormMultiSelect
				{position}
				{align}
				{options}
				selected={selectedPathways}
				label="Pathways"
				paddingY="py-3"
				paddingX="px-4"
				onchange={handlePathwaysChange}
			/>
		</div>
	{/if}
</div>
