<script>
	import SearchInput from '../SearchInput.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import FilterOptionList from './FilterOptionList.svelte';
	import { countSelectedLeaves } from '../../_utils/filter-options.js';

	/**
	 * @typedef {import('../../_utils/filter-options.js').FilterOption} FilterOption
	 * @typedef {{ selected: boolean, indeterminate: boolean, isChild: boolean }} RowState
	 */

	/**
	 * Pill trigger + dropdown panel for multi-select filters (Region, Status,
	 * Technology). Selections apply immediately via `onchange`; the Apply
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
		onchange,
		onclear,
		onselectall,
		row
	} = $props();

	let panelSearchTerm = $state('');

	let selectedCount = $derived(countSelectedLeaves(options, selected));
</script>

<FilterPanel
	{label}
	badge={selectedCount || null}
	active={selectedCount > 0}
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

	<div class="px-2 py-1 max-h-[320px] overflow-y-auto">
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
