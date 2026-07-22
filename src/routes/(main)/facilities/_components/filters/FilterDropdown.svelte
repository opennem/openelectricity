<script>
	import SearchInput from '../SearchInput.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import FilterOptionList from './FilterOptionList.svelte';
	import {
		countSelectedLeaves,
		getLeafValues,
		isDefaultSelection,
		toggleInSelection
	} from '$lib/facilities/filter-options.js';

	/**
	 * @typedef {import('$lib/facilities/filter-options.js').FilterOption} FilterOption
	 * @typedef {{ selected: boolean, indeterminate: boolean, isChild: boolean }} RowState
	 */

	/**
	 * Pill trigger + dropdown panel for multi-select filters (Type, Status,
	 * Region). Checkbox changes are STAGED in a local draft — nothing applies
	 * until the Apply button fires `onapply` with the final selection.
	 * Dismissing the panel any other way (outside click, scroll, pill toggle)
	 * discards the draft; it re-seeds from `selected` on the next open.
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
	 *   onapply?: (values: string[]) => void,
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
		onapply,
		row
	} = $props();

	let panelSearchTerm = $state('');

	// The staged selection while the panel is open. Seeded from the committed
	// `selected` on open; committed via onapply; discarded on dismiss.
	/** @type {string[]} */
	let draft = $state([]);

	let draftCount = $derived(countSelectedLeaves(options, draft));
	let selectedCount = $derived(countSelectedLeaves(options, selected));

	// Deviation-aware badge on the pill — always reflects the COMMITTED
	// selection, not the draft. With `defaults`, the pill only badges when
	// the selection differs from its default — under the literal "ticked =
	// shown" model a fresh page has many boxes ticked, and a raw count would
	// read as a permanently active filter. Stray non-leaf values are ignored.
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
		if (open) {
			draft = [...selected];
		} else {
			panelSearchTerm = '';
		}
	}}
	onapply={() => onapply?.(draft)}
>
	{#snippet footerLeft()}
		<button
			type="button"
			class="text-sm text-dark-grey underline underline-offset-2 hover:text-black cursor-pointer"
			onclick={() => (draft = getLeafValues(options))}
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
			{draftCount} selected
		</span>
		<button
			type="button"
			class="text-xs text-mid-grey hover:text-dark-grey underline underline-offset-2 transition-colors cursor-pointer"
			onclick={() => (draft = defaults ? [...defaults] : [])}
		>
			{clearLabel}
		</button>
	</div>

	<div class="px-2 py-1 overflow-y-auto" style="max-height: {listMaxHeight}px">
		<FilterOptionList
			{options}
			selected={draft}
			{defaultExpanded}
			searchTerm={panelSearchTerm}
			dense
			onchange={(value, isMetaPressed) => (draft = toggleInSelection(draft, value, isMetaPressed))}
			{row}
		/>
	</div>
</FilterPanel>
