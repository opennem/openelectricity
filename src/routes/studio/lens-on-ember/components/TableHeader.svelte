<script>
	import { getContext } from 'svelte';
	import formatDateBasedOnInterval from '$lib/utils/formatters-data-interval';

	export let yearOnly = false;
	export let date;

	const { selectedInterval, is12MthRollingSum } = getContext('filters');
</script>

<header class="flex justify-end h-12 px-10 md:px-0">
	{#if date}
		<span class="font-semibold">
			{#if yearOnly}
				{formatDateBasedOnInterval(date)}
			{:else}
				{$is12MthRollingSum ? 'Year to' : ''}
				{formatDateBasedOnInterval(date, $selectedInterval)}
			{/if}
		</span>
	{/if}
</header>
