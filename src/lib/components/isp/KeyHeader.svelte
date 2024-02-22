<script>
	import { formatValue } from './helpers';

	export let key = '';
	export let title = '';
	/** @type {TimeSeriesData | undefined} */
	export let data = undefined;

	$: value = data ? /** @type {number} */ (data[key]) : 0;
</script>

<header class="grid grid-cols-6 items-center content-center mb-6">
	<h6 class="truncate mb-0 col-span-5">{title}</h6>
	{#if data}
		<span class="text-right text-xs font-semibold">
			{formatValue(value)}
		</span>
	{/if}
</header>
