<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();

	/**
	 * @typedef {Object} Props
	 * @property {{ label: string, value: string | number }[]} [buttons]
	 * @property {string | number } [selected]
	 * @property {(value: string) => void} [onclick]
	 */

	/** @type {Props} */
	let { buttons = [], selected = '', onclick = () => {} } = $props();

	function handleClick(e) {
		onclick(e);
		bubble('click');
	}
</script>

<div class="flex text-xs">
	{#each buttons as { label, value }}
		<button
			onclick={handleClick}
			{value}
			class="bg-light-warm-grey hover:bg-white border border-solid border-mid-warm-grey border-r-0 px-4 py-2 first:rounded-md first:rounded-r-none last:rounded-md last:rounded-l-none last:border-r"
			class:bg-white={selected === value}
		>
			{label}
		</button>
	{/each}
</div>
