<script>
	import { getContext } from 'svelte';
	import formatDateBasedOnInterval from '$lib/utils/formatters-data-interval';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [yearOnly]
	 * @property {any} date
	 * @property {any} store
	 */

	/** @type {Props} */
	let { yearOnly = false, date, store } = $props();

	const { selectedInterval, is12MthRollingSum } = getContext('filters');
	const { xDomain, seriesData } = store;

	let dateRange =
		$derived($xDomain && $xDomain.length === 2 && $xDomain[0] && $xDomain[1]
			? $xDomain
			: $seriesData.length
			? [$seriesData[0].date, $seriesData[$seriesData.length - 1].date]
			: null);
</script>

<header class="flex justify-center h-12 px-10 md:px-0">
	{#if date}
		<span class="font-semibold text-sm mt-2">
			{#if yearOnly}
				{formatDateBasedOnInterval(date)}
			{:else}
				{$is12MthRollingSum ? 'Year to' : ''}
				{formatDateBasedOnInterval(date, $selectedInterval)}
			{/if}
		</span>
	{:else if dateRange}
		<span class="font-semibold text-sm mt-2">
			{#if yearOnly}
				{formatDateBasedOnInterval(dateRange[0])}
				<small class="font-light">to</small>
				{formatDateBasedOnInterval(dateRange[1])}
			{:else}
				{formatDateBasedOnInterval(dateRange[0], $selectedInterval)}
				<small class="font-light">to</small>
				{formatDateBasedOnInterval(dateRange[1], $selectedInterval)}
			{/if}
		</span>
	{/if}
</header>
