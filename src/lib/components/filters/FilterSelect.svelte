<script>
	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import FilterPanel from './FilterPanel.svelte';

	/**
	 * Single-select dropdown in the filter-pill design — FilterPanel's pill +
	 * portalled panel around a plain listbox. No staged draft or Apply footer:
	 * picking an option applies immediately and closes the panel. The pill
	 * shows the selected option's label and goes active (dark) when the value
	 * deviates from `defaultValue`, matching the deviation-aware styling of
	 * the facilities pills.
	 *
	 * The generalisation of the tracker's RegionDropdown — use this for any
	 * pick-one control that should look like the Region pill.
	 *
	 * @type {{
	 *   selected: string,
	 *   options: Array<{ value: string, label: string }>,
	 *   listLabel: string,
	 *   defaultValue?: string | null,
	 *   compact?: boolean,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let { selected, options, listLabel, defaultValue = null, compact = false, onchange } = $props();

	let selectedOption = $derived(options.find((o) => o.value === selected) ?? options[0]);

	/**
	 * @param {string} value
	 * @param {() => void} close
	 */
	function handleSelect(value, close) {
		close();
		if (value !== selected) onchange?.(value);
	}
</script>

<FilterPanel
	label={selectedOption.label}
	active={defaultValue !== null && selected !== defaultValue}
	{compact}
>
	{#snippet children(close)}
		<ul class="flex flex-col text-sm px-2 py-2" role="listbox" aria-label={listLabel}>
			{#each options as option (option.value)}
				{@const isSelected = option.value === selected}
				<li class="whitespace-nowrap">
					<button
						type="button"
						role="option"
						aria-selected={isSelected}
						class="w-full flex items-center gap-3 rounded-md text-dark-grey hover:bg-warm-grey cursor-pointer px-2 py-2"
						onclick={() => handleSelect(option.value, close)}
					>
						<span class="flex-1 text-left truncate">{option.label}</span>
						{#if isSelected}
							<IconCheckMark class="size-4 shrink-0" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/snippet}
</FilterPanel>
