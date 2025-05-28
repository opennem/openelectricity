<script>
	import Switch from '../Switch.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} [mapTitle]
	 * @property {string} [mapMode]
	 * @property {string} [dispatch]
	 * @property {(value: string) => void} onChange
	 */

	/** @type {Props & { [key: string]: any }} */
	let { mapTitle = '', mapMode = '', dispatch = '', onChange, ...rest } = $props();
</script>

<header class={rest.class}>
	<h3 class="text-center">{mapTitle}</h3>

	<div class="my-8 md:my-0">
		<Switch
			buttons={[
				{ label: 'Carbon Intensity', value: 'annual' },
				{ label: 'Live Flows', value: 'live', icon: 'live' }
			]}
			selected={mapMode}
			class="justify-center my-4"
			{onChange}
		/>
	</div>

	{#if dispatch}
		<div class="font-space text-mid-grey uppercase text-sm tracking-wider text-center">
			{dispatch}
		</div>
	{/if}

	{#if mapMode === 'live'}
		<div class="font-space text-dark-red uppercase text-xxs tracking-wider text-center">
			Live flows and price data are currently unavailable.
		</div>
	{/if}
</header>
