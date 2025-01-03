<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} [current]
	 */

	/** @type {Props} */
	let { current = 'line' } = $props();

	const dispatch = createEventDispatcher();

	const options = [
		{
			name: 'line',
			icon: 'presentation-chart-line'
		},
		{
			name: 'bar',
			icon: 'presentation-chart-bar'
		}
	];

	let optionsLength = $derived(options.length);
</script>

<div class="flex">
	{#each options as { name, icon }, i}
		<button
			class="w-full relative p-4 bg-light-warm-grey border rounded-tl-md rounded-bl-md hover:bg-white"
			class:rounded-tl-md={i === 0}
			class:rounded-bl-md={i === 0}
			class:rounded-tr-md={i === optionsLength - 1}
			class:rounded-br-md={i === optionsLength - 1}
			class:-left-1={i === optionsLength - 1}
			class:bg-white={current === name}
			class:z-10={current === name}
			class:shadow={current === name}
			class:rounded-md={current === name}
			class:border-black={current === name}
			class:border-mid-warm-grey={current !== name}
			onclick={() => dispatch('change', name)}
		>
			<span class="flex justify-center text-dark-grey">
				<Icon {icon} size={19} />
			</span>
		</button>
	{/each}
</div>
