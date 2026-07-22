<script>
	import SearchInput from '../SearchInput.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import FilterOptionList from './FilterOptionList.svelte';
	import {
		countSelectedLeaves,
		getLeafValues,
		isDefaultSelection
	} from '$lib/facilities/filter-options.js';

	/**
	 * @typedef {import('$lib/facilities/filter-options.js').FilterOption} FilterOption
	 * @typedef {{ selected: boolean, indeterminate: boolean, isChild: boolean }} RowState
	 */

	/**
	 * Pill trigger + dropdown panel for multi-select filters (Type, Status,
	 * Region). Selections apply immediately via `onchange`; the Apply
	 * button only closes the panel.
	 * @type {{
	 *   label: string,
	 *   options: FilterOption[],
	 *   selected: string[],
	 *   searchable?: boolean,
	 *   searchPlaceholder?: string,
	 *   defaultExpanded?: string[],
	 *   compact?: boolean,
	 *   clearLabel?: string,
	 *   defaults?: string[] | null,
	 *   listMaxHeight?: number,
	 *   onchange?: (value: string | string[], isMetaPressed: boolean) => void,
	 *   onclear?: () => void,
	 *   onselectall?: () => void,
	 *   row?: import('svelte').Snippet<[FilterOption, RowState]>
	 * }}
	 */
	let {
		label,
		options = [],
		selected = [],
		searchable = false,
		searchPlaceholder = 'Search',
		defaultExpanded = [],
		compact = false,
		clearLabel = 'Clear',
		defaults = null,
		/** Scroll cap for the option list (px) — raise it for tall trees. */
		listMaxHeight = 320,
		onchange,
		onclear,
		onselectall,
		row
	} = $props();

	let panelSearchTerm = $state('');

	let selectedCount = $derived(countSelectedLeaves(options, selected));

	// Deviation-aware badge: with `defaults`, the pill only badges when the
	// selection differs from its default — under the literal "ticked = shown"
	// model a fresh page has many boxes ticked, and a raw count would read as
	// a permanently active filter. Stray non-leaf values are ignored.
	let atDefault = $derived.by(() => {
		if (!defaults) return false;
		const leaves = new Set(getLeafValues(options));
		return isDefaultSelection(
			selected.filter((value) => leaves.has(value)),
			defaults
		);
	});
	let badgeCount = $derived(defaults && atDefault ? 0 : selectedCount);
</script>

<FilterPanel
	{label}
	badge={badgeCount || null}
	active={defaults ? !atDefault : selectedCount > 0}
	{compact}
	onopenchange={(open) => {
		if (!open) panelSearchTerm = '';
	}}
>
	{#snippet footerLeft()}
		<button
			type="button"
			class="text-sm text-dark-grey underline underline-offset-2 hover:text-black cursor-pointer"
			onclick={() => onselectall?.()}
		>
			Select all
		</button>
	{/snippet}

	{#if searchable}
		<div class="p-3 border-b border-warm-grey">
			<SearchInput
				value={panelSearchTerm}
				placeholder={searchPlaceholder}
				compact
				debounceMs={100}
				onchange={(value) => (panelSearchTerm = value)}
				class="w-full"
			/>
		</div>
	{/if}

	<div class="px-4 pt-3 pb-1 flex items-center justify-between gap-4">
		<span class="font-space uppercase text-xxs tracking-wider text-mid-grey">
			{selectedCount} selected
		</span>
		<button
			type="button"
			class="text-xs text-mid-grey hover:text-dark-grey underline underline-offset-2 transition-colors cursor-pointer"
			onclick={() => onclear?.()}
		>
			{clearLabel}
		</button>
	</div>

	<div class="px-2 py-1 overflow-y-auto" style="max-height: {listMaxHeight}px">
		<FilterOptionList
			{options}
			{selected}
			{defaultExpanded}
			searchTerm={panelSearchTerm}
			dense
			{onchange}
			{row}
		/>
	</div>
</FilterPanel>
