<script>
	import FilterPanel from './FilterPanel.svelte';

	/**
	 * Single-select dropdown in the filter-pill design — FilterPanel's pill +
	 * portalled panel around a plain listbox. No staged draft or Apply footer:
	 * picking an option applies immediately and closes the panel. The pill
	 * shows the selected option's label and goes active (dark) when the value
	 * deviates from `defaultValue`, matching the deviation-aware styling of
	 * the facilities pills.
	 *
	 * Options may have one level of independently selectable `children`.
	 * `divider: true` adds a separator after the option.
	 *
	 * The generalisation of the tracker's RegionDropdown — use this for any
	 * pick-one control that should look like the Region pill.
	 */

	/** @typedef {{ value: string, label: string }} SelectOption */

	/**
	 * @type {{
	 *   selected: string,
	 *   options: Array<SelectOption & { children?: SelectOption[], divider?: boolean }>,
	 *   listLabel: string,
	 *   defaultValue?: string | null,
	 *   compact?: boolean,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let { selected, options, listLabel, defaultValue = null, compact = false, onchange } = $props();

	let flatOptions = $derived(options.flatMap((o) => [o, ...(o.children ?? [])]));
	let selectedOption = $derived(flatOptions.find((o) => o.value === selected) ?? options[0]);

	/**
	 * @param {string} value
	 * @param {() => void} close
	 */
	function handleSelect(value, close) {
		close();
		if (value !== selected) onchange?.(value);
	}
</script>

{#snippet optionRow(/** @type {SelectOption} */ option, /** @type {() => void} */ close)}
	{@const isSelected = option.value === selected}
	<button
		type="button"
		role="option"
		aria-selected={isSelected}
		class="w-full flex items-center gap-3 rounded-md {isSelected
			? 'text-black'
			: 'text-mid-grey'} hover:bg-warm-grey cursor-pointer px-2 py-2"
		onclick={() => handleSelect(option.value, close)}
	>
		<span class="flex-1 text-left truncate">{option.label}</span>
		<span
			class="flex size-[15px] shrink-0 items-center justify-center rounded-full border {isSelected
				? 'border-mid-grey'
				: 'border-mid-warm-grey'}"
			aria-hidden="true"
		>
			{#if isSelected}<span class="size-[9px] rounded-full bg-dark-grey"></span>{/if}
		</span>
	</button>
{/snippet}

<FilterPanel
	label={selectedOption.label}
	active={defaultValue !== null && selected !== defaultValue}
	{compact}
>
	{#snippet children(close)}
		<ul class="flex flex-col text-sm px-2 py-2" role="listbox" aria-label={listLabel}>
			{#each options as option (option.value)}
				<li class="whitespace-nowrap">
					{@render optionRow(option, close)}
					{#if option.children && option.children.length > 0}
						<ul class="ml-4 border-l border-warm-grey pl-1" role="none">
							{#each option.children as child (child.value)}
								<li class="whitespace-nowrap">
									{@render optionRow(child, close)}
								</li>
							{/each}
						</ul>
					{/if}
					{#if option.divider}
						<div class="my-1 h-px bg-warm-grey" role="separator"></div>
					{/if}
				</li>
			{/each}
		</ul>
	{/snippet}
</FilterPanel>
