<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import { regions, fuelTechOptions } from './page-data-options/filters.js';

	let { initialStatuses, onstatuseschange, onregionschange, onfueltechschange } = $props();

	let statusOptions = [
		{
			label: 'Committed',
			value: 'committed'
		},
		{
			label: 'Operating',
			value: 'operating'
		},
		{
			label: 'Retired',
			value: 'retired'
		}
	];

	let selectedFuelTechs = $state([]);
	let selectedRegions = $state([]);
	let selectedStatuses = $state(initialStatuses);

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
		if (selectedRegions.length === 0) {
			return 'Region';
		} else if (selectedRegions.length === 1) {
			let region = regions.find((r) => r.value === selectedRegions[0]);
			return region?.longLabel || selectedRegions[0];
		} else {
			return `${selectedRegions.length} Regions`;
		}
	});

	let statusLabel = $derived.by(() => {
		if (selectedStatuses.length === 0) {
			return 'Status';
		} else if (selectedStatuses.length === 1) {
			let status = statusOptions.find((s) => s.value === selectedStatuses[0]);
			return status?.label || selectedStatuses[0];
		} else {
			return `${selectedStatuses.length} Statuses`;
		}
	});

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		if (isMetaPressed) {
			selectedRegions = [value];
		} else if (selectedRegions.includes(value)) {
			selectedRegions = selectedRegions.filter((item) => item !== value);
		} else {
			selectedRegions = [...selectedRegions, value];
		}

		onregionschange?.(selectedRegions);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		if (isMetaPressed) {
			selectedFuelTechs = [value];
		} else if (selectedFuelTechs.includes(value)) {
			selectedFuelTechs = selectedFuelTechs.filter((item) => item !== value);
		} else {
			selectedFuelTechs = [...selectedFuelTechs, value];
		}

		onfueltechschange?.(selectedFuelTechs);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusesChange(value, isMetaPressed) {
		if (isMetaPressed) {
			selectedStatuses = [value];
		} else if (selectedStatuses.includes(value)) {
			selectedStatuses = selectedStatuses.filter((item) => item !== value);
		} else {
			selectedStatuses = [...selectedStatuses, value];
		}

		onstatuseschange?.(selectedStatuses);
	}
</script>

<div class="flex bg-white opacity-90 pt-3 pb-3 relative z-10">
	<div class="hidden md:inline-flex justify-start items-center">
		<FormMultiSelect
			options={statusOptions}
			selected={selectedStatuses}
			label={statusLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			on:change={(evt) => handleStatusesChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>

		<FormMultiSelect
			options={regionOptions}
			selected={selectedRegions}
			label={regionLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			on:change={(evt) => handleRegionChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>

		<FormMultiSelect
			options={fuelTechOptions}
			selected={selectedFuelTechs}
			label="Technology"
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			on:change={(evt) => handleFuelTechChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>
	</div>
</div>
