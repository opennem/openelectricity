<script>
	import Switch from '../Switch.svelte';
	export let mapTitle = '';
	export let mapMode = '';
	export let dispatch = '';
	/** @type {(value: string) => void} */
	export let onChange;
</script>

<header class={$$restProps.class}>
	<h3>{mapTitle}</h3>
	<Switch
		buttons={[
			{ label: 'Live Flows', value: 'live', icon: 'live' },
			{ label: 'Carbon Intensity', value: 'annual' }
		]}
		selected={mapMode}
		class="justify-center my-4"
		{onChange}
	/>
	{#if dispatch}
		<div class="font-space font-medium text-mid-grey uppercase text-sm">
			{dispatch}
		</div>
	{/if}
</header>
