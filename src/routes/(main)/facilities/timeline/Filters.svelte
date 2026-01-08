<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';

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
			value: 'committed',
			colour: '#e0dfdc'
		},
		{
			label: 'Commissioning',
			value: 'commissioning',
			colour: '#ffb108'
		},
		{
			label: 'Operating',
			value: 'operating',
			colour: '#75e74d'
		},
		{
			label: 'Retired',
			value: 'retired',
			colour: '#6a6a6a'
		}
	];

	let showMobileFilterOptions = $state(false);

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

		<section class="p-10 pb-0 w-full flex gap-10">
			<div class="flex flex-col gap-5">
				<FormMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label="Region"
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
				/>
				<FormMultiSelect
					options={statusOptions}
					selected={selectedStatuses}
					label="Status"
					withColours={true}
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => handleStatusesChange(value, isMetaPressed)}
				/>
			</div>

			<FormMultiSelect
				options={fuelTechOptions}
				selected={selectedFuelTechs}
				label="Technology"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => handleFuelTechChange(value, isMetaPressed)}
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

<div class="flex items-center justify-between pt-3 pb-3 px-8 md:pl-3 relative z-10 gap-4">
	<div class="justify-start items-center gap-2 hidden md:flex">
		<FormMultiSelect
			options={regionOptions}
			selected={selectedRegions}
			label={regionLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
		/>

		<FormMultiSelect
			options={statusOptions}
			selected={selectedStatuses}
			label={statusLabel}
			withColours={true}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			onchange={(value, isMetaPressed) => handleStatusesChange(value, isMetaPressed)}
		/>

		<FormMultiSelect
			options={fuelTechOptions}
			selected={selectedFuelTechs}
			label={fuelTechLabel}
			paddingX="pl-5 pr-4"
			paddingY="py-3"
			onchange={(value, isMetaPressed) => handleFuelTechChange(value, isMetaPressed)}
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

	<div class="md:hidden pl-8 ml-4 border-l border-warm-grey">
		<ButtonIcon onclick={() => (showMobileFilterOptions = true)}>
			<IconAdjustmentsHorizontal class="size-10" />
		</ButtonIcon>
	</div>
</div>
