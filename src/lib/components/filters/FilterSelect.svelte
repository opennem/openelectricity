<script>
	import FilterPanel from './FilterPanel.svelte';
	import NativeSelect from './NativeSelect.svelte';
	import { hasTouchControls } from '$lib/components/ui/touch-controls.js';

	/**
	 * Single-select dropdown in the filter-pill design — FilterPanel's pill +
	 * portalled panel around a plain listbox. No staged draft or Apply footer:
	 * picking an option applies immediately and closes the panel. The pill
	 * shows the selected option's label and goes active (dark) when the value
	 * deviates from `defaultValue`, matching the deviation-aware styling of
	 * the facilities pills.
	 *
	 * Options may have one level of independently selectable `children`.
	 * `divider: true` adds a separator after the option; `disabled: true`
	 * shows it dimmed and unselectable. Consecutive options sharing a `group`
	 * sit under that subheader (an ARIA group), and `selectedLabel` names the
	 * option on the pill where its list label leans on the subheader ("Bars"
	 * under "Radial" shows as "Radial bars"); an option's `shortLabel` replaces
	 * it on the pill below `lg` ("NEM" for the National Electricity Market).
	 * A `footer` snippet renders below the
	 * list for controls that modify the choice rather than being one. A
	 * `trigger` snippet replaces the pill (see FilterPanel).
	 *
	 * In a touch-controls subtree (`touch-controls.js`), phones get the
	 * platform's own picker (`NativeSelect`) instead of the panel, unless a
	 * `footer` or `trigger` needs the custom panel or `native={false}` asks for
	 * it. Both are rendered and CSS picks one, so the server render is right.
	 *
	 * The generalisation of the tracker's RegionDropdown — use this for any
	 * pick-one control that should look like the Region pill.
	 */

	/** @typedef {{ value: string, label: string, selectedLabel?: string, shortLabel?: string, disabled?: boolean }} SelectOption */

	/**
	 * @type {{
	 *   selected: string,
	 *   options: Array<SelectOption & { children?: SelectOption[], divider?: boolean, group?: string }>,
	 *   listLabel: string,
	 *   defaultValue?: string | null,
	 *   compact?: boolean,
	 *   disabled?: boolean,
	 *   native?: boolean,
	 *   footer?: import('svelte').Snippet<[() => void]>,
	 *   trigger?: import('svelte').Snippet<[{ open: boolean, toggle: () => void }]>,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let {
		selected,
		options,
		listLabel,
		defaultValue = null,
		compact = false,
		disabled = false,
		native = true,
		footer,
		trigger,
		onchange
	} = $props();

	let flatOptions = $derived(options.flatMap((o) => [o, ...(o.children ?? [])]));
	let selectedOption = $derived(flatOptions.find((o) => o.value === selected) ?? options[0]);
	/** Runs of consecutive options under the same `group` (none for ungrouped). */
	let sections = $derived(
		options.reduce((runs, option) => {
			const last = runs.at(-1);
			if (last && last.group === option.group) last.options.push(option);
			else runs.push({ group: option.group, options: [option] });
			return runs;
		}, /** @type {Array<{ group: string | undefined, options: typeof options }>} */ ([]))
	);
	const uid = $props.id();
	const touch = hasTouchControls();
	let nativeOnPhone = $derived(touch && native && !footer && !trigger);
	let pillLabel = $derived(selectedOption.selectedLabel ?? selectedOption.label);
	let active = $derived(defaultValue !== null && selected !== defaultValue);

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
		disabled={option.disabled}
		class="w-full flex items-center gap-5 rounded-md disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent {isSelected
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

{#snippet optionItem(
	/** @type {SelectOption & { children?: SelectOption[], divider?: boolean }} */ option,
	/** @type {() => void} */ close
)}
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
{/snippet}

{#snippet panel()}
	<FilterPanel
		label={pillLabel}
		title={listLabel}
		shortLabel={selectedOption.shortLabel}
		{active}
		{compact}
		{disabled}
		{trigger}
	>
		{#snippet children(close)}
			<ul class="flex flex-col text-sm px-2 py-2" role="listbox" aria-label={listLabel}>
				{#each sections as section, index (index)}
					{#if section.group}
						<li role="presentation">
							<div
								id="{uid}-group-{index}"
								class="px-2 pb-1 pt-3 text-xxs font-medium uppercase tracking-wider text-dark-grey"
							>
								{section.group}
							</div>
							<ul role="group" aria-labelledby="{uid}-group-{index}">
								{#each section.options as option (option.value)}
									{@render optionItem(option, close)}
								{/each}
							</ul>
						</li>
					{:else}
						{#each section.options as option (option.value)}
							{@render optionItem(option, close)}
						{/each}
					{/if}
				{/each}
			</ul>
			{#if footer}
				<div class="border-t border-warm-grey px-2 py-2 text-sm">{@render footer(close)}</div>
			{/if}
		{/snippet}
	</FilterPanel>
{/snippet}

{#if nativeOnPhone}
	<NativeSelect
		class="tablet:hidden"
		{selected}
		{options}
		label={selectedOption.shortLabel ?? pillLabel}
		{listLabel}
		{active}
		{compact}
		{disabled}
		onchange={(value) => onchange?.(value)}
	/>
	<div class="contents max-tablet:hidden">{@render panel()}</div>
{:else}
	{@render panel()}
{/if}
