<script>
	import { getFormattedMonth } from '$lib/utils/formatters';

	export let yearOnly = false;
	export let date;
</script>

<header class="flex justify-end h-12 px-10 md:px-0">
	{#if date}
		<span class="font-semibold">
			{#if yearOnly}
				{getFormattedMonth(date)}
			{:else}
				{getFormattedMonth(date, 'short')}
			{/if}
		</span>
	{/if}
</header>
