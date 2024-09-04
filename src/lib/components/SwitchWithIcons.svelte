<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	/** @type {{ label: string, value: string | number, icon?: *, size?: string }[]} */
	export let buttons = [];
	/** @type {string | number } */
	export let selected = '';
	/** @type {(value: string) => void} */
	export let onChange = () => {};

	$: isSelected = (value) => selected === value;

	function handleClick(e) {
		onChange(e.currentTarget.value);
		dispatch('change', { value: e.currentTarget.value });
	}
</script>

<!-- selected === value -->

<div
	class={`flex text-sm md:inline-flex rounded-xl bg-light-warm-grey border border-solid border-mid-warm-grey ${$$restProps.class}`}
>
	{#each buttons as { label, value, icon, size }}
		<button
			on:click={handleClick}
			{value}
			class="flex w-full gap-3 md:w-auto items-center justify-center hover:text-black px-4 py-4 md:px-8 md:py-4 border rounded-xl whitespace-nowrap"
			class:bg-white={isSelected(value)}
			class:text-black={isSelected(value)}
			class:border-black={isSelected(value)}
			class:shadow-lg={isSelected(value)}
			class:text-mid-grey={!isSelected(value)}
			class:border-transparent={!isSelected(value)}
		>
			{#if icon}
				<svelte:component this={icon} class={size} />
			{/if}
			{label}
		</button>
	{/each}
</div>

<style>
	.shadow {
		box-shadow: 0.2rem 0 0.3rem 0 rgba(0, 0, 0, 0.1);
	}
</style>
