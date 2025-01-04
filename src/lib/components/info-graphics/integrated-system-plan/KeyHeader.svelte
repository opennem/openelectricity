<script>
	import Icon from '$lib/components/Icon.svelte';
	import { formatValue } from './helpers';

	
	/**
	 * @typedef {Object} Props
	 * @property {string} [key]
	 * @property {string} [fuelTechId]
	 * @property {string} [title]
	 * @property {TimeSeriesData | undefined} [data]
	 * @property {boolean} [showIcon]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		key = '',
		fuelTechId = '',
		title = '',
		data = undefined,
		showIcon = false,
		children
	} = $props();

	/** @type {'TWh' | '%'} */
	let display = 'TWh'; // or '%'

	let value = $derived(data ? /** @type {number} */ (data[key]) : 0);
	let percent = $derived(data && data._max ? (value / data._max) * 100 : 0);

	let displayValue = $derived(display === 'TWh' ? formatValue(value) : formatValue(percent));
</script>

<header class="">
	<div class="flex justify-between items-center">
		<h6 {title} class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
		{#if showIcon}
			<Icon icon={fuelTechId} size={28} />
		{/if}
	</div>

	<h3 class="leading-sm h-24 mt-4">
		{@render children?.()}
	</h3>
</header>
