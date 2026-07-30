<script>
	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import FilterPanel from '$lib/components/filters/FilterPanel.svelte';
	import { regionOptions } from '$lib/regions.js';

	/**
	 * Single-select region dropdown in the facilities filter-pill design,
	 * reusing FilterPanel's pill + portalled panel chrome. Unlike the
	 * multi-select facilities dropdowns there is no staged draft or Apply
	 * footer — only one value can hold at a time, so picking a region applies
	 * immediately and closes the panel. The pill shows the selected region and
	 * goes active (dark) when it deviates from the `_all` default, matching
	 * the deviation-aware styling of the facilities pills.
	 * @type {{
	 *   selected: string,
	 *   compact?: boolean,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let { selected, compact = false, onchange } = $props();

	let selectedOption = $derived(
		regionOptions.find((o) => o.value === selected) ?? regionOptions[0]
	);

	/**
	 * @param {string} value
	 * @param {() => void} close
	 */
	function handleSelect(value, close) {
		close();
		if (value !== selected) onchange?.(value);
	}
</script>

<FilterPanel label={selectedOption.label} active={selected !== '_all'} {compact}>
	{#snippet children(close)}
		<ul class="flex flex-col text-sm px-2 py-2" role="listbox" aria-label="Region">
			{#each regionOptions as option (option.value)}
				{@const isSelected = option.value === selected}
				<li class="whitespace-nowrap">
					<button
						type="button"
						role="option"
						aria-selected={isSelected}
						class="w-full flex items-center gap-3 rounded-md text-dark-grey hover:bg-warm-grey cursor-pointer px-2 py-2"
						onclick={() => handleSelect(option.value, close)}
					>
						<span class="size-4 rounded-full shrink-0" style="background-color: {option.colour}"
						></span>
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
