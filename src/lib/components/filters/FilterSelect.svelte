<script>
	import FilterAccordionSection from './FilterAccordionSection.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import FilterRadioList from './FilterRadioList.svelte';
	import FilterSheetSection from './FilterSheetSection.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import NativeSelect from './NativeSelect.svelte';
	import { inFilterSheet } from './filter-sheet.js';
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
	 * In a phone filter sheet (`filter-sheet.js`) it is the sheet's section
	 * instead, titled `listLabel`. A flat list (no children or groups;
	 * dividers are dropped) is a segmented switch, one tap to pick, wrapping
	 * into rows of up to four; a nested or grouped one is a radio list that
	 * unfolds under the title, with the picked option as its tag, and folds
	 * again once a pick lands. The `footer` sits under either.
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
	const touch = hasTouchControls();
	const sheet = inFilterSheet();
	let sheetSegments = $derived(options.every((o) => !o.children?.length && !o.group));
	/** One row up to three; four as 2 × 2; then rows of three up to six (the
	 * interval's longer labels), and of four beyond (a year's months). */
	let segmentColumns = $derived(
		options.length <= 3 ? options.length : options.length === 4 ? 2 : options.length <= 6 ? 3 : 4
	);
	let nativeOnPhone = $derived(touch && native && !footer && !trigger);
	/** Whether the filter sheet's section is unfolded. */
	let sheetOpen = $state(false);
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
			<div class="px-2 py-2">
				<FilterRadioList
					{options}
					{selected}
					label={listLabel}
					onselect={(value) => handleSelect(value, close)}
				/>
			</div>
			{#if footer}
				<div class="border-t border-warm-grey px-2 py-2 text-sm">{@render footer(close)}</div>
			{/if}
		{/snippet}
	</FilterPanel>
{/snippet}

{#if sheet && sheetSegments}
	<FilterSheetSection title={listLabel}>
		<Switch
			buttons={options.map((o) => ({ label: o.label, value: o.value, disabled: o.disabled }))}
			{selected}
			columns={segmentColumns}
			rounded="rounded-lg"
			darkSelected
			aria-label={listLabel}
			onchange={(option) => {
				if (option.value !== selected) onchange?.(option.value);
			}}
		/>
		{#if footer}
			<div class="text-sm">{@render footer(() => {})}</div>
		{/if}
	</FilterSheetSection>
{:else if sheet}
	<FilterAccordionSection title={listLabel} tags={[pillLabel]} bind:open={sheetOpen}>
		<FilterRadioList
			{options}
			{selected}
			label={listLabel}
			mode="radiogroup"
			onselect={(value) => handleSelect(value, () => (sheetOpen = false))}
		/>
		{#if footer}
			<div class="mt-2 border-t border-warm-grey pt-2 text-sm">
				{@render footer(() => (sheetOpen = false))}
			</div>
		{/if}
	</FilterAccordionSection>
{:else if nativeOnPhone}
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
