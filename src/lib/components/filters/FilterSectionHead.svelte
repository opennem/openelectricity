<script>
	import Icon from '../Icon.svelte';

	/** @type {import('svelte/elements').MouseEventHandler<HTMLButtonElement> | null} */
	export let toggleHandler = null;
	/** @type {import('svelte/elements').MouseEventHandler<HTMLButtonElement> | null} */
	export let clearHandler = null;

	export let hasFilters = false;
	export let isOpen = false;
	export let title = '';
	export let clearTitle = 'Clear';
</script>

<header class="flex justify-between items-center">
	{#if toggleHandler}
		<button
			on:click|preventDefault={toggleHandler}
			class="subhead-secondary text-dark-grey grow text-left">{title}</button
		>
	{:else}
		<h4 class="subhead-secondary text-dark-grey grow text-left mb-0">{title}</h4>
	{/if}
	{#if hasFilters && clearHandler}
		<button on:click|preventDefault={clearHandler} class="text-link-large ml-auto mr-4 leading-sm"
			>{clearTitle}</button
		>
	{/if}
	{#if toggleHandler}
		<Icon
			icon="chev-up"
			class={`transition-transform origin-center ${isOpen ? '' : 'rotate-180'}`}
			size={8}
		/>
	{/if}
</header>
