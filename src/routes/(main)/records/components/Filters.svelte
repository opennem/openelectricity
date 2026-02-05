<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import LinkCopyButton from '$lib/components/LinkCopyButton.svelte';

	import { regions } from '../page-data-options/filters.js';
	import { viewSectionOptions } from '../page-data-options/view-sections';

	import {
		fuelTechOptions,
		milestoneTypeOptions,
		periodOptions
	} from '../page-data-options/filters.js';

	const { selectedView, selectedRegions, selectedFuelTechs, selectedMetrics, selectedPeriods } =
		getContext('records-filters');

	let showMobileFilterOptions = $state(false);

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedFuelTechs = [value];
		} else if ($selectedFuelTechs.includes(value)) {
			$selectedFuelTechs = $selectedFuelTechs.filter((/** @type {string} */ item) => item !== value);
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
			$selectedMetrics = $selectedMetrics.filter((/** @type {string} */ item) => item !== value);
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
			$selectedPeriods = $selectedPeriods.filter((/** @type {string} */ item) => item !== value);
		} else {
			$selectedPeriods = [...$selectedPeriods, value];
		}
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedRegions = [value];
		} else if ($selectedRegions.includes(value)) {
			$selectedRegions = $selectedRegions.filter((/** @type {string} */ item) => item !== value);
		} else {
			$selectedRegions = [...$selectedRegions, value];
		}
	}

	let regionOptions = $derived(
		regions.map((r) => ({
			label: r.label,
			value: r.value,
			divider: r.divider,
			labelClassName: regions?.find((m) => m.value === r.longValue)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	let regionLabel = $derived.by(() => {
		if ($selectedRegions.length === 0) {
			return 'Region';
		} else if ($selectedRegions.length === 1) {
			let region = regions.find((r) => r.value === $selectedRegions[0]);
			return region?.longLabel || $selectedRegions[0];
		} else {
			return `${$selectedRegions.length} Regions`;
		}
	});
</script>

{#if showMobileFilterOptions}
	<Modal
		maxWidthClass=""
		class="fixed! bg-white top-0 bottom-0 left-0 right-0 overflow-y-auto overscroll-contain rounded-none! my-0! pt-0 px-0 z-50"
	>
		<header
			class="sticky top-0 z-50 bg-white pb-2 pt-6 px-10 flex justify-between items-center border-b border-warm-grey"
		>
			<h3 class="mb-2">Filters</h3>

			<div class="mb-2">
				<IconAdjustmentsHorizontal class="size-10" />
			</div>
		</header>

		<section class="p-10 pb-0 w-full flex gap-5">
			<FormMultiSelect
				options={regionOptions}
				selected={$selectedRegions}
				label="Region"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
			/>
			<FormMultiSelect
				options={fuelTechOptions}
				selected={$selectedFuelTechs}
				label="Technology"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => handleFuelTechChange(value, isMetaPressed)}
			/>
		</section>

		<section class="p-10 w-full flex gap-5">
			<FormMultiSelect
				options={milestoneTypeOptions}
				selected={$selectedMetrics}
				label="Metric"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => handleMetricChange(value, isMetaPressed)}
			/>

			<FormMultiSelect
				options={periodOptions}
				selected={$selectedPeriods}
				label="Period"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => handlePeriodChange(value, isMetaPressed)}
			/>
		</section>

		{#snippet buttons()}
			<div class="flex gap-3">
				<Button
					class="bg-dark-grey! text-white hover:bg-black! w-full"
					onclick={() => (showMobileFilterOptions = false)}>Close</Button
				>
			</div>
		{/snippet}
	</Modal>
{/if}

<div class="container">
	<div class="flex justify-end md:justify-between items-center">
		<div class="hidden md:inline-flex justify-start items-center">
			<FormMultiSelect
				options={regionOptions}
				selected={$selectedRegions}
				label={regionLabel}
				paddingX="pl-5 pr-4"
				paddingY="py-3"
				onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
			/>

			<FormMultiSelect
				options={fuelTechOptions}
				selected={$selectedFuelTechs}
				label="Technology"
				paddingX="pl-5 pr-4"
				paddingY="py-3"
				onchange={(value, isMetaPressed) => handleFuelTechChange(value, isMetaPressed)}
			/>

			<FormMultiSelect
				options={milestoneTypeOptions}
				selected={$selectedMetrics}
				label="Metric"
				paddingX="px-4"
				paddingY="py-3"
				onchange={(value, isMetaPressed) => handleMetricChange(value, isMetaPressed)}
			/>

			<FormMultiSelect
				options={periodOptions}
				selected={$selectedPeriods}
				label="Period"
				paddingX="px-4"
				paddingY="py-3"
				onchange={(value, isMetaPressed) => handlePeriodChange(value, isMetaPressed)}
			/>
		</div>

		<div class="hidden md:flex items-center gap-8 border-l border-warm-grey pl-8">
			<Switch
				buttons={viewSectionOptions}
				selected={$selectedView}
				onchange={(option) => ($selectedView = option.value)}
				class="justify-center"
			/>

			<div class="border-l border-warm-grey pl-8">
				<LinkCopyButton />
			</div>
		</div>

		<div class="md:hidden pl-8 ml-4 border-l border-warm-grey">
			<ButtonIcon onclick={() => (showMobileFilterOptions = true)}>
				<IconAdjustmentsHorizontal class="size-10" />
			</ButtonIcon>
		</div>
	</div>
</div>
