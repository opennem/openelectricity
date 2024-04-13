<script>
	import Icon from '$lib/components/Icon.svelte';
	import { formatValue } from './helpers';

	export let key = '';
	export let fuelTechId = '';
	export let title = '';
	/** @type {TimeSeriesData | undefined} */
	export let data = undefined;

	$: value = data ? /** @type {number} */ (data[key]) : 0;
</script>

<header class="">
	<div class="flex justify-between items-center">
		<h6 class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
		<Icon icon={fuelTechId} size={28} />
	</div>

	<h3 class="h-24 leading-sm mt-4">
		{#if data}
			{data ? formatValue(value) : '—'}
			<small class="block text-xs text-mid-grey font-light">TWh</small>
		{/if}
	</h3>
</header>
