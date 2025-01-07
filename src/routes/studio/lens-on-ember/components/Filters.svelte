<script>
	import { getContext } from 'svelte';
	import { pushState } from '$app/navigation';

	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {EmberCountry[]} countries
	 */

	/** @type {Props} */
	let { countries } = $props();

	const { selectedRegion, selectedRange, selectedInterval } = getContext('filters');
	const rangeOptions = [
		{
			label: 'Monthly',
			value: 'monthly'
		},
		{
			label: '12 mth rolling',
			value: '12-month-rolling'
		},
		{
			label: 'Yearly',
			value: 'yearly'
		}
	];
	const monthlyIntervalOptions = [
		{
			label: 'Month',
			value: '1M'
		},
		{
			label: 'Quarter',
			value: '1Q'
		},
		{
			label: 'Half Year',
			value: '6M'
		},
		{
			label: 'Year',
			value: '1Y'
		}
	];
	const rollingIntervalOptions = [
		{
			label: 'Month',
			value: '1M'
		},
		{
			label: 'Quarter',
			value: '1Q'
		},
		{
			label: 'Half Year',
			value: '6M'
		}
	];

	$selectedRange = 'monthly';
	$selectedInterval = '1M';

	// iso string begins with `x-` for regions
	let regionsOnly = $derived(countries.filter((country) => country.iso.startsWith('x-')));
	let countriesOnly = $derived(countries.filter((country) => !country.iso.startsWith('x-')));

	/**
	 * @param {string} interval
	 */
	function handleIntervalChange(interval) {
		$selectedInterval = interval;
		pushState(`?region=${$selectedRegion}&range=${$selectedRange}&interval=${interval}`, {});
	}
</script>

<div class="w-full px-6 md:px-0 flex flex-col md:flex-row gap-5 md:gap-10 justify-center">
	<select
		class="flex flex-col gap-2 border-dark-grey outline-none bg-light-warm-grey p-4 rounded-lg text-sm"
		name="region"
		bind:value={$selectedRegion}
	>
		<optgroup label="Regions">
			{#each regionsOnly as region}
				<option value={region.iso}>{region.name}</option>
			{/each}
		</optgroup>

		<optgroup label="Countries">
			{#each countriesOnly as country}
				<option value={country.iso}>{country.name}</option>
			{/each}
		</optgroup>
	</select>

	<div class="flex gap-5 md:gap-10 justify-between px-2 md:px-0">
		<div class="flex gap-2 md:gap-5 items-center">
			<span class="font-mono text-xs text-mid-grey">Dataset</span>
			<div class="md:hidden">
				<FormSelect
					paddingX="px-4"
					paddingY="py-3"
					selectedLabelClass="text-sm font-semibold whitespace-nowrap"
					options={rangeOptions}
					selected={$selectedRange}
					on:change={(evt) => ($selectedRange = evt.detail.value)}
				/>
			</div>
			<div class="hidden md:block">
				<Switch
					buttons={rangeOptions}
					selected={$selectedRange}
					xPad={4}
					yPad={2}
					textSize="sm"
					on:change={(evt) => ($selectedRange = evt.detail.value)}
				/>
			</div>
		</div>

		{#if $selectedRange !== 'yearly'}
			<div class="flex gap-2 md:gap-5 items-center">
				<span class="font-mono text-xs text-mid-grey">Interval</span>
				<div class="md:hidden">
					<FormSelect
						paddingX="px-4"
						paddingY="py-3"
						align="right"
						selectedLabelClass="text-sm font-semibold whitespace-nowrap"
						options={$selectedRange === 'monthly' ? monthlyIntervalOptions : rollingIntervalOptions}
						selected={$selectedInterval}
						on:change={(evt) => handleIntervalChange(evt.detail.value)}
					/>
				</div>
				<div class="hidden md:block">
					<Switch
						buttons={$selectedRange === 'monthly' ? monthlyIntervalOptions : rollingIntervalOptions}
						selected={$selectedInterval}
						xPad={4}
						yPad={2}
						textSize="sm"
						on:change={(evt) => handleIntervalChange(evt.detail.value)}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
