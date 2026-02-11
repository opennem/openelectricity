<script>
	/**
	 * @typedef {{ label: string, value: number }} RangeOption
	 */

	/** @type {{ options: RangeOption[], selected: number | null, onchange?: (value: number) => void }} */
	let { options, selected = $bindable(), onchange } = $props();

	/**
	 * @param {number} value
	 */
	function handleClick(value) {
		selected = value;
		onchange?.(value);
	}
</script>

<div class="flex items-center gap-1.5">
	{#each options as option (option.value)}
		<button
			class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors {selected === option.value
				? 'bg-dark-grey text-white'
				: 'border border-warm-grey text-mid-grey hover:bg-light-warm-grey'}"
			onclick={() => handleClick(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
