<script>
	/**
	 * MultiSwitch — the multi-select sibling of `SwitchWithIcons`: the same
	 * compact track and buttons, but any number of options can be on, each
	 * filled dark like the switcher's thumb. A click toggles one option;
	 * ⌘/Ctrl-click asks for that option alone (`solo`), as the tracker tables'
	 * row toggles do.
	 *
	 * @typedef {{ value: string, label: string, title?: string }} MultiSwitchOption
	 * @typedef {Object} Props
	 * @property {MultiSwitchOption[]} buttons
	 * @property {string[]} selected - The values that are on
	 * @property {string} [rounded] - Tailwind radius class for the track and buttons
	 * @property {string} [label] - The group's accessible name
	 * @property {(value: string, options: { solo: boolean }) => void} ontoggle
	 */

	/** @type {Props} */
	let { buttons, selected, rounded = 'rounded-lg', label = undefined, ontoggle } = $props();
</script>

<div
	role="group"
	aria-label={label}
	class="inline-flex shrink-0 gap-0.5 border border-solid border-warm-grey bg-white p-1 text-xs {rounded}"
>
	{#each buttons as option (option.value)}
		{@const on = selected.includes(option.value)}
		<button
			type="button"
			aria-pressed={on}
			title={option.title}
			onclick={(event) => ontoggle(option.value, { solo: event.metaKey || event.ctrlKey })}
			class="cursor-pointer whitespace-nowrap px-3 py-1.5 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none {rounded} {on
				? 'bg-dark-grey text-white'
				: 'text-mid-grey hover:bg-light-warm-grey hover:text-black'}"
		>
			{option.label}
		</button>
	{/each}
</div>
