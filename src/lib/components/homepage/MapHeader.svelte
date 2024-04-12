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
</header>
