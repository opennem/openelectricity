<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from './Icon.svelte';

	const dispatch = createEventDispatcher();

	/** @type {{ label: string, value: string | number, icon?: string }[]} */
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
	class={`flex md:inline-flex text-sm w-full md:w-auto mx-10 md:mx-0 rounded-xl bg-light-warm-grey border border-solid border-mid-warm-grey ${$$restProps.class}`}
>
	{#each buttons as { label, value, icon }, i}
		<button
			on:click={handleClick}
			{value}
			class="flex w-full md:w-auto items-center justify-center hover:text-black px-8 py-4 border rounded-xl whitespace-nowrap"
			class:bg-white={isSelected(value)}
			class:text-black={isSelected(value)}
			class:border-black={isSelected(value)}
			class:shadow-lg={isSelected(value)}
			class:text-mid-grey={!isSelected(value)}
			class:border-transparent={!isSelected(value)}
		>
			{label}
			{#if icon}
				<Icon
					{icon}
					size={16}
					class={`ml-4 ${selected === value ? 'text-success-green' : 'text-transparent'}`}
				/>
			{/if}
		</button>
	{/each}
</div>

<style>
	.shadow {
		box-shadow: 0.2rem 0 0.3rem 0 rgba(0, 0, 0, 0.1);
	}
</style>
