<script>
	/**
	 * @typedef {Object} Props
	 * @property {{ id: string, label: string }[]} tabs
	 * @property {string} active
	 */

	/** @type {Props} */
	let { tabs, active = $bindable('') } = $props();
</script>

<div class="flex border-b border-mid-warm-grey">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			onclick={() => (active = tab.id)}
			class="px-3 py-2 text-xs font-medium transition-colors {active === tab.id
				? 'border-b-2 border-black text-black'
				: 'text-mid-grey hover:text-dark-grey'}"
		>
			{tab.label}
		</button>
	{/each}
</div>
