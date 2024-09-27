<script>
	import { getContext } from 'svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import { regionOptions } from '$lib/regions';
	import {
		fuelTechOptions,
		milestoneTypeOptions,
		periodOptions
	} from '../page-data-options/filters.js';

	const { selectedFuelTechs, selectedMetrics, selectedPeriods } = getContext('records-filters');
	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedFuelTechs = [value];
		} else if ($selectedFuelTechs.includes(value)) {
			$selectedFuelTechs = $selectedFuelTechs.filter((item) => item !== value);
		} else {
			$selectedFuelTechs = [...$selectedFuelTechs, value];
		}
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleMetricChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedMetrics = [value];
		} else if ($selectedMetrics.includes(value)) {
			$selectedMetrics = $selectedMetrics.filter((item) => item !== value);
		} else {
			$selectedMetrics = [...$selectedMetrics, value];
		}
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handlePeriodChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedPeriods = [value];
		} else if ($selectedPeriods.includes(value)) {
			$selectedPeriods = $selectedPeriods.filter((item) => item !== value);
		} else {
			$selectedPeriods = [...$selectedPeriods, value];
		}
	}
</script>

<div class="container">
	<div class="inline-flex justify-start">
		<FormMultiSelect
			options={fuelTechOptions}
			selected={$selectedFuelTechs}
			label="Technology"
			paddingX="px-7"
			paddingY="py-3"
			on:change={(evt) => handleFuelTechChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>

		<FormMultiSelect
			options={milestoneTypeOptions}
			selected={$selectedMetrics}
			label="Metric"
			paddingX="px-7"
			paddingY="py-3"
			on:change={(evt) => handleMetricChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>

		<FormMultiSelect
			options={periodOptions}
			selected={$selectedPeriods}
			label="Period"
			paddingX="px-7"
			paddingY="py-3"
			on:change={(evt) => handlePeriodChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>
	</div>
</div>
