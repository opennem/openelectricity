<script>
	import { untrack } from 'svelte';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';
	import { filterOptionsBySearch, getLeafValues } from '$lib/facilities/filter-options.js';

	/**
	 * @typedef {import('$lib/facilities/filter-options.js').FilterOption} FilterOption
	 * @typedef {{ selected: boolean, indeterminate: boolean, isChild: boolean }} RowState
	 */

	/**
	 * Tri-state hierarchical checkbox list (any nesting depth), shared by the
	 * desktop dropdown panels and the mobile filter sheet. Only leaf values
	 * live in `selected`; clicking a group emits the array of its (visible)
	 * descendant leaf values.
	 *
	 * The `row` snippet renders everything right of the checkbox, so any row
	 * variation (icons, right-aligned counts, meta text) can be supplied
	 * without touching this component.
	 * @type {{
	 *   options: FilterOption[],
	 *   selected: string[],
	 *   defaultExpanded?: string[],
	 *   searchTerm?: string,
	 *   dense?: boolean,
	 *   onchange?: (value: string | string[], isMetaPressed: boolean) => void,
	 *   row?: import('svelte').Snippet<[FilterOption, RowState]>
	 * }}
	 */
	let {
		options = [],
		selected = [],
		defaultExpanded = [],
		searchTerm = '',
		dense = false,
		onchange,
		row
	} = $props();

	let isMetaPressed = $state(false);

	/** @type {Record<string, boolean>} */
	let expandedState = $state(
		untrack(() =>
			defaultExpanded.reduce((acc, value) => {
				acc[value] = true;
				return acc;
			}, /** @type {Record<string, boolean>} */ ({}))
		)
	);

	let isSearching = $derived(searchTerm.trim().length > 0);
	let visibleOptions = $derived(isSearching ? filterOptionsBySearch(options, searchTerm) : options);

	/**
	 * While searching every visible group is treated as expanded so matches stay visible.
	 * @param {string} value
	 */
	function isExpanded(value) {
		return isSearching || !!expandedState[value];
	}

	/**
	 * Handle option selection. Groups pass the (search-pruned) option so
	 * toggling only affects the visible descendant leaves.
	 * @param {string} value
	 * @param {FilterOption} [groupOption]
	 */
	function handleSelect(value, groupOption) {
		if (groupOption?.children && groupOption.children.length > 0) {
			onchange?.(getLeafValues(groupOption.children), isMetaPressed);
		} else {
			onchange?.(value, isMetaPressed);
		}
	}

	/**
	 * @param {FilterOption} opt
	 * @returns {boolean}
	 */
	function areAllLeavesSelected(opt) {
		const leaves = getLeafValues(opt.children ?? []);
		if (leaves.length === 0) return false;
		return leaves.every((value) => selected.includes(value));
	}

	/**
	 * @param {FilterOption} opt
	 * @returns {boolean}
	 */
	function areSomeLeavesSelected(opt) {
		const leaves = getLeafValues(opt.children ?? []);
		if (leaves.length === 0) return false;
		const selectedCount = leaves.filter((value) => selected.includes(value)).length;
		return selectedCount > 0 && selectedCount < leaves.length;
	}

	/**
	 * @param {MouseEvent} e
	 * @param {string} value
	 */
	function toggleExpanded(e, value) {
		e.stopPropagation();
		expandedState[value] = !expandedState[value];
	}

	/**
	 * @param {string} value
	 */
	function isSelected(value) {
		return selected.includes(value);
	}

	function handleKeyup() {
		isMetaPressed = false;
	}

	/**
	 * @param {KeyboardEvent} evt
	 */
	function handleKeydown(evt) {
		if (evt.metaKey || evt.altKey) {
			isMetaPressed = true;
		} else {
			isMetaPressed = false;
		}

		// Reset meta key after 5 seconds
		setTimeout(() => {
			isMetaPressed = false;
		}, 5000);
	}
</script>

{#snippet defaultRow(/** @type {FilterOption} */ option)}
	{#if option.colour}
		<span class="size-4 rounded-full shrink-0" style="background-color: {option.colour}"></span>
	{/if}
	<span class="capitalize flex-1 text-left truncate">{option.label}</span>
{/snippet}

{#snippet checkbox(/** @type {boolean} */ checked, /** @type {boolean} */ indeterminate)}
	<span
		class="border rounded size-6 flex items-center justify-center shrink-0 transition-colors {checked
			? 'bg-dark-grey border-dark-grey text-white'
			: indeterminate
				? 'border-dark-grey'
				: 'border-mid-warm-grey'}"
	>
		{#if checked}
			<IconCheckMark class="size-4" />
		{:else if indeterminate}
			<span class="w-3 h-0.5 bg-dark-grey"></span>
		{/if}
	</span>
{/snippet}

{#snippet optionRows(/** @type {FilterOption[]} */ opts, /** @type {number} */ depth)}
	<!-- The chevron-width spacer only exists to align childless rows with
	     sibling groups — flat sibling sets skip it. -->
	{@const siblingsHaveChildren = opts.some((o) => !!(o.children && o.children.length > 0))}
	{#each opts as opt (opt.value)}
		{@const hasChildren = !!(opt.children && opt.children.length > 0)}
		{@const allSelected = hasChildren ? areAllLeavesSelected(opt) : isSelected(opt.value)}
		{@const someSelected = hasChildren ? areSomeLeavesSelected(opt) : false}
		<li class="whitespace-nowrap">
			<div class="flex items-center gap-1">
				{#if hasChildren}
					<button
						type="button"
						onclick={(e) => toggleExpanded(e, opt.value)}
						class="p-1 rounded hover:bg-warm-grey cursor-pointer shrink-0"
						aria-label="Toggle {opt.label} sub-options"
					>
						<IconChevronDown
							class="size-4 transition-transform duration-200 {isExpanded(opt.value)
								? ''
								: '-rotate-90'}"
						/>
					</button>
				{:else if siblingsHaveChildren}
					<div class="w-6 shrink-0"></div>
				{/if}

				<button
					type="button"
					class="flex-1 min-w-0 flex items-center gap-3 rounded-md text-dark-grey hover:bg-warm-grey cursor-pointer px-2 {dense
						? 'py-2'
						: 'py-2.5'}"
					onclick={() => handleSelect(opt.value, hasChildren ? opt : undefined)}
				>
					{@render checkbox(allSelected, someSelected)}
					{@render (row ?? defaultRow)(opt, {
						selected: allSelected,
						indeterminate: someSelected,
						isChild: depth > 0
					})}
				</button>
			</div>

			{#if hasChildren && isExpanded(opt.value)}
				<!-- Top level: ml-12 places the guide line centred beneath the parent
				     checkbox (24px chevron + 4px gap + 8px button padding + 12px
				     half-checkbox). Deeper levels indent less so nested trees stay
				     within the panel width. -->
				<ul class="{depth === 0 ? 'ml-12' : 'ml-6'} pl-2 border-l border-warm-grey">
					{@render optionRows(opt.children ?? [], depth + 1)}
				</ul>
			{/if}
		</li>
	{/each}
{/snippet}

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<ul class="flex flex-col text-sm">
	{@render optionRows(visibleOptions, 0)}
</ul>
