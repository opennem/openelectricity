<script>
	import { getContext } from 'svelte';
	import { pushState } from '$app/navigation';

	import Switch from '$lib/components/Switch.svelte';

	/** @type {EmberCountry[]} */
	export let countries;

	const { selectedRegion, selectedRange, selectedInterval } = getContext('filters');

	$selectedRange = 'monthly';
	$selectedInterval = '1M';

	// iso string begins with `x-` for regions
	$: regionsOnly = countries.filter((country) => country.iso.startsWith('x-'));
	$: countriesOnly = countries.filter((country) => !country.iso.startsWith('x-'));

	/**
	 * @param {string} interval
	 */
	function handleIntervalChange(interval) {
		$selectedInterval = interval;
		pushState(`?region=${$selectedRegion}&range=${$selectedRange}&interval=${interval}`, {});
	}
</script>

<div class="flex gap-10">
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

	<div class="flex gap-5 items-center">
		<span class="font-mono text-xs text-mid-grey">Dataset</span>
		<Switch
			buttons={[
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
			]}
			selected={$selectedRange}
			xPad={4}
			yPad={2}
			textSize="sm"
			on:change={(evt) => ($selectedRange = evt.detail.value)}
		/>
	</div>

	{#if $selectedRange === 'monthly'}
		<Switch
			buttons={[
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
			]}
			selected={$selectedInterval}
			xPad={4}
			yPad={2}
			textSize="sm"
			on:change={(evt) => handleIntervalChange(evt.detail.value)}
		/>
	{/if}

	{#if $selectedRange === '12-month-rolling'}
		<Switch
			buttons={[
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
			]}
			selected={$selectedInterval}
			xPad={4}
			yPad={2}
			textSize="sm"
			on:change={(evt) => handleIntervalChange(evt.detail.value)}
		/>
	{/if}
</div>
