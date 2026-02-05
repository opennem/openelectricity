<script>
	import { preventDefault } from 'svelte/legacy';

	import Icon from '../Icon.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {((event: Event, ...args: unknown[]) => void) | null} [toggleHandler]
	 * @property {((event: Event, ...args: unknown[]) => void) | null} [clearHandler]
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
			onclick={preventDefault(/** @type {(event: Event, ...args: unknown[]) => void} */ (toggleHandler))}
			class="subhead-secondary text-dark-grey grow text-left">{title}</button
		>
	{:else}
		<h4 class="subhead-secondary text-dark-grey grow text-left mb-0">{title}</h4>
	{/if}
	{#if hasFilters && clearHandler}
		<button onclick={preventDefault(/** @type {(event: Event, ...args: unknown[]) => void} */ (clearHandler))} class="text-link-large ml-auto mr-4 leading-sm"
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
