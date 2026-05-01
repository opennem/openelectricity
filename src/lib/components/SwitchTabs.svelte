<script>
	import { Tabs } from 'bits-ui';

	/**
	 * Tabs-style switcher built on bits-ui `Tabs`. Drop-in replacement for the
	 * `Switch` API but renders as classic tabs (no surrounding pill, underline
	 * beneath the active item) — suited to dense control panels.
	 *
	 * @typedef {Object} Props
	 * @property {{ label: string, value: string | number }[]} [buttons]
	 * @property {string | number} [selected]
	 * @property {(value: string) => void} [onChange]
	 * @property {string} [class]
	 */

	/** @type {Props} */
	let { buttons = [], selected = '', onChange = () => {}, class: className = '' } = $props();

	let value = $derived(String(selected));

	/** @param {string} newValue */
	function handleValueChange(newValue) {
		if (newValue && newValue !== value) onChange(newValue);
	}
</script>

<Tabs.Root {value} onValueChange={handleValueChange} class={className}>
	<Tabs.List
		class="inline-flex items-center gap-1 rounded-md bg-light-warm-grey p-1 border border-mid-warm-grey/40"
	>
		{#each buttons as { label, value: btnValue } (btnValue)}
			<Tabs.Trigger
				value={String(btnValue)}
				class="px-3 py-1 rounded text-xs text-mid-grey hover:text-dark-grey transition-colors data-[state=active]:bg-white data-[state=active]:text-dark-grey data-[state=active]:shadow-sm cursor-pointer"
			>
				{label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
