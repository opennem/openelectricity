<script>
	import Icon from './Icon.svelte';

	/** @type {{ label: string, value: string | number, icon?: string }[]} */
	export let buttons = [];
	/** @type {string | number } */
	export let selected = '';
	/** @type {(value: string) => void} */
	export let onChange = (value) => {};
</script>

<div class={`inline-flex text-sm rounded-md bg-light-warm-grey ${$$restProps.class}`}>
	{#each buttons as { label, value, icon }}
		<button
			on:click={(e) => onChange(e.currentTarget.value)}
			{value}
			class={`flex items-center bg-light-warm-grey hover:bg-white px-8 py-4 rounded-md border border-solid border-mid-warm-grey ml-[-0.4rem] first:ml-0 ${
				selected === value ? ' bg-white shadow z-30' : ''
			}`}
		>
			{label}
			{#if icon}<Icon
					{icon}
					size={16}
					class={`ml-4 ${selected === value ? 'text-success-green' : 'text-transparent'}`}
				/>{/if}
		</button>
	{/each}
</div>

<style>
	.shadow {
		box-shadow: 0.2rem 0 0.3rem 0 rgba(0, 0, 0, 0.1);
	}
</style>
