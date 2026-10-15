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
	 * @property {boolean} [compact] - 26px tall, for chart-card headers beside
	 *   their compact toggles
	 * @property {string} [ariaLabel] - Accessible name for the tab list
	 */

	/** @type {Props} */
	let {
		buttons = [],
		selected = '',
		onChange = () => {},
		class: className = '',
		compact = false,
		ariaLabel
	} = $props();

	let value = $derived(String(selected));

	/** @param {string} newValue */
	function handleValueChange(newValue) {
		if (newValue && newValue !== value) onChange(newValue);
	}
</script>

<Tabs.Root {value} onValueChange={handleValueChange} class={className}>
	<Tabs.List
		aria-label={ariaLabel}
		class="inline-flex items-center rounded-md bg-light-warm-grey border border-mid-warm-grey/40 {compact
			? 'h-[26px] gap-0.5 p-0.5'
			: 'gap-1 p-1'}"
	>
		{#each buttons as { label, value: btnValue } (btnValue)}
			<Tabs.Trigger
				value={String(btnValue)}
				class="{compact
					? 'h-full px-2.5'
					: 'px-3 py-1'} touch-hit rounded text-xs text-mid-grey hover:text-dark-grey transition-colors data-[state=active]:bg-white data-[state=active]:text-dark-grey data-[state=active]:shadow-sm cursor-pointer"
			>
				{label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
