<script>
	import { goto } from '$app/navigation';
	import { getFiltersContext } from '../states/filters.svelte';

	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	let cxt = getFiltersContext();

	// iso string begins with `x-` for regions
	let regionsOnly = $derived(cxt.countries?.filter((country) => country.iso.startsWith('x-')));
	let countriesOnly = $derived(cxt.countries?.filter((country) => !country.iso.startsWith('x-')));

	$effect(() => {
		if (cxt.selectedRegion && cxt.selectedRange && cxt.selectedInterval) {
			let intervalQuery = cxt.isYearly ? '' : `&interval=${cxt.selectedInterval}`;
			goto(`?region=${cxt.selectedRegion}&range=${cxt.selectedRange}${intervalQuery}`, {
				noScroll: true
			});
		}
	});
</script>

<div class="w-full px-6 md:px-0 flex flex-col md:flex-row gap-5 md:gap-10 justify-center">
	<select
		class="flex flex-col gap-2 border-dark-grey outline-none bg-light-warm-grey p-4 rounded-lg text-sm"
		name="region"
		bind:value={cxt.selectedRegion}
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
					options={cxt.ranges}
					selected={cxt.selectedRange}
					on:change={(evt) => (cxt.selectedRange = evt.detail.value)}
				/>
			</div>
			<div class="hidden md:block">
				<Switch
					buttons={cxt.ranges}
					selected={cxt.selectedRange}
					xPad={4}
					yPad={2}
					textSize="sm"
					on:change={(evt) => (cxt.selectedRange = evt.detail.value)}
				/>
			</div>
		</div>

		{#if cxt.selectedRangeIntervals}
			<div class="flex gap-2 md:gap-5 items-center">
				<span class="font-mono text-xs text-mid-grey">Interval</span>
				<div class="md:hidden">
					<FormSelect
						paddingX="px-4"
						paddingY="py-3"
						align="right"
						selectedLabelClass="text-sm font-semibold whitespace-nowrap"
						options={cxt.selectedRangeIntervals}
						selected={cxt.selectedInterval}
						on:change={(evt) => (cxt.selectedInterval = evt.detail.value)}
					/>
				</div>
				<div class="hidden md:block">
					<Switch
						buttons={cxt.selectedRangeIntervals}
						selected={cxt.selectedInterval}
						xPad={4}
						yPad={2}
						textSize="sm"
						on:change={(evt) => (cxt.selectedInterval = evt.detail.value)}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
