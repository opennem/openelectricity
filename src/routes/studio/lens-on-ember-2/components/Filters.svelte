<script>
	import { goto } from '$app/navigation';
	import { getFiltersContext } from '../states/filters.svelte';

	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	let filtersCxt = getFiltersContext();

	// iso string begins with `x-` for regions
	let regionsOnly = $derived(
		filtersCxt.countries?.filter((country) => country.iso.startsWith('x-'))
	);
	let countriesOnly = $derived(
		filtersCxt.countries?.filter((country) => !country.iso.startsWith('x-'))
	);

	$effect(() => {
		if (filtersCxt.selectedRegion && filtersCxt.selectedRange && filtersCxt.selectedInterval) {
			let intervalQuery = filtersCxt.isYearly ? '' : `&interval=${filtersCxt.selectedInterval}`;
			goto(
				`?region=${filtersCxt.selectedRegion}&range=${filtersCxt.selectedRange}${intervalQuery}`
			);
		}
	});
</script>

<div class="w-full px-6 md:px-0 flex flex-col md:flex-row gap-5 md:gap-10 justify-center">
	<select
		class="flex flex-col gap-2 border-dark-grey outline-none bg-light-warm-grey p-4 rounded-lg text-sm"
		name="region"
		bind:value={filtersCxt.selectedRegion}
	>
		{#if regionsOnly}
			<optgroup label="Regions">
				{#each regionsOnly as region}
					<option value={region.iso}>{region.name}</option>
				{/each}
			</optgroup>
		{/if}

		{#if countriesOnly}
			<optgroup label="Countries">
				{#each countriesOnly as country}
					<option value={country.iso}>{country.name}</option>
				{/each}
			</optgroup>
		{/if}
	</select>

	<div class="flex gap-5 md:gap-10 justify-between px-2 md:px-0">
		<div class="flex gap-2 md:gap-5 items-center">
			<span class="font-mono text-xs text-mid-grey">Dataset</span>
			<div class="md:hidden">
				<FormSelect
					paddingX="px-4"
					paddingY="py-3"
					selectedLabelClass="text-sm font-semibold whitespace-nowrap"
					options={filtersCxt.ranges}
					selected={filtersCxt.selectedRange}
					on:change={(evt) => (filtersCxt.selectedRange = evt.detail.value)}
				/>
			</div>
			<div class="hidden md:block">
				<Switch
					buttons={filtersCxt.ranges}
					selected={filtersCxt.selectedRange}
					xPad={4}
					yPad={2}
					textSize="sm"
					on:change={(evt) => (filtersCxt.selectedRange = evt.detail.value)}
				/>
			</div>
		</div>

		{#if !filtersCxt.isYearly}
			<div class="flex gap-2 md:gap-5 items-center">
				<span class="font-mono text-xs text-mid-grey">Interval</span>
				<div class="md:hidden">
					<FormSelect
						paddingX="px-4"
						paddingY="py-3"
						align="right"
						selectedLabelClass="text-sm font-semibold whitespace-nowrap"
						options={filtersCxt.isMonthly
							? filtersCxt.monthlyIntervals
							: filtersCxt.rollingIntervals}
						selected={filtersCxt.selectedInterval}
						on:change={(evt) => (filtersCxt.selectedInterval = evt.detail.value)}
					/>
				</div>
				<div class="hidden md:block">
					<Switch
						buttons={filtersCxt.isMonthly
							? filtersCxt.monthlyIntervals
							: filtersCxt.rollingIntervals}
						selected={filtersCxt.selectedInterval}
						xPad={4}
						yPad={2}
						textSize="sm"
						on:change={(evt) => (filtersCxt.selectedInterval = evt.detail.value)}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
