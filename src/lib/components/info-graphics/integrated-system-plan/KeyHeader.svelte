<script>
	import Icon from '$lib/components/Icon.svelte';
	import { formatValue } from './helpers';

	export let key = '';
	export let fuelTechId = '';
	export let title = '';
	/** @type {TimeSeriesData | undefined} */
	export let data = undefined;
	export let showIcon = false;

	/** @type {'TWh' | '%'} */
	let display = 'TWh'; // or '%'

	$: value = data ? /** @type {number} */ (data[key]) : 0;
	$: percent = data && data._max ? (value / data._max) * 100 : 0;

	$: displayValue = display === 'TWh' ? formatValue(value) : formatValue(percent);
</script>

<header class="">
	<div class="flex justify-between items-center">
		<h6 {title} class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
		{#if showIcon}
			<Icon icon={fuelTechId} size={28} />
		{/if}
	</div>

	<h3 class="leading-sm h-24 mt-4">
		<slot />
	</h3>
</header>
