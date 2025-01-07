<script>
	import { preventDefault } from 'svelte/legacy';

	import Icon from '../Icon.svelte';

	
	

	/**
	 * @typedef {Object} Props
	 * @property {import('svelte/elements').MouseEventHandler<HTMLButtonElement> | null} [toggleHandler]
	 * @property {import('svelte/elements').MouseEventHandler<HTMLButtonElement> | null} [clearHandler]
	 * @property {boolean} [hasFilters]
	 * @property {boolean} [isOpen]
	 * @property {string} [title]
	 * @property {string} [clearTitle]
	 */

	/** @type {Props} */
	let {
		toggleHandler = null,
		clearHandler = null,
		hasFilters = false,
		isOpen = false,
		title = '',
		clearTitle = 'Clear'
	} = $props();
</script>

<header class="flex justify-between items-center py-8">
	{#if toggleHandler}
		<button
			onclick={preventDefault(toggleHandler)}
			class="subhead-secondary text-dark-grey grow text-left">{title}</button
		>
	{:else}
		<h4 class="subhead-secondary text-dark-grey grow text-left mb-0">{title}</h4>
	{/if}
	{#if hasFilters && clearHandler}
		<button onclick={preventDefault(clearHandler)} class="text-link-large ml-auto mr-4 leading-sm"
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
