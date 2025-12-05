<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import { regions, fuelTechOptions } from './page-data-options/filters.js';

	let {
		selectedRegions = [],
		selectedStatuses = [],
		selectedFuelTechs = [],
		searchTerm = '',
		onstatuseschange,
		onregionschange,
		onfueltechschange,
		onsearchchange
	} = $props();

	let statusOptions = [
		{
			label: 'Committed',
			value: 'committed'
		},
		{
			label: 'Commissioning',
			value: 'commissioning'
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

	let fuelTechLabel = $derived.by(() => {
		if (selectedFuelTechs.length === 0) {
			return 'Technology';
		} else if (selectedFuelTechs.length === 1) {
			let fuelTech = fuelTechOptions.find((ft) => ft.value === selectedFuelTechs[0]);
			return fuelTech?.label || selectedFuelTechs[0];
		} else {
			return `${selectedFuelTechs.length} Technologies`;
		}
	});

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		let newSelectedRegions = [];
		if (isMetaPressed) {
			newSelectedRegions = [value];
		} else if (selectedRegions.includes(value)) {
			newSelectedRegions = selectedRegions.filter((item) => item !== value);
		} else {
			newSelectedRegions = [...selectedRegions, value];
		}

		onregionschange?.(newSelectedRegions);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		let newSelectedFuelTechs = [];
		if (isMetaPressed) {
			newSelectedFuelTechs = [value];
		} else if (selectedFuelTechs.includes(value)) {
			newSelectedFuelTechs = selectedFuelTechs.filter((item) => item !== value);
		} else {
			newSelectedFuelTechs = [...selectedFuelTechs, value];
		}

		onfueltechschange?.(newSelectedFuelTechs);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusesChange(value, isMetaPressed) {
		let newSelectedStatuses = [];
		if (isMetaPressed) {
			newSelectedStatuses = [value];
		} else if (selectedStatuses.includes(value)) {
			newSelectedStatuses = selectedStatuses.filter((item) => item !== value);
		} else {
			newSelectedStatuses = [...selectedStatuses, value];
		}

		onstatuseschange?.(newSelectedStatuses);
	}
</script>

<div class="flex items-center justify-between pt-3 pb-3 pl-3 relative z-10 gap-4">
	<div class="flex justify-start items-center gap-2">
		<FormMultiSelect
			options={regionOptions}
			selected={selectedRegions}
			label={regionLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			on:change={(evt) => handleRegionChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>

		<FormMultiSelect
			options={statusOptions}
			selected={selectedStatuses}
			label={statusLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			on:change={(evt) => handleStatusesChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>

		<FormMultiSelect
			options={fuelTechOptions}
			selected={selectedFuelTechs}
			label={fuelTechLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			on:change={(evt) => handleFuelTechChange(evt.detail.value, evt.detail.isMetaPressed)}
		/>
	</div>

	<div class="flex justify-end items-center gap-2 pr-8">
		<input
			type="search"
			value={searchTerm}
			oninput={(e) => onsearchchange?.(e.target.value)}
			placeholder="Filter by name"
			class="rounded-full border border-warm-grey bg-white px-5 py-3 text-xs transition-colors hover:border-dark-grey focus:border-dark-grey focus:outline-none"
		/>
	</div>
</div>
