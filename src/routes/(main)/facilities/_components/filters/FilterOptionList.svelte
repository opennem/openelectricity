<script>
	import { untrack } from 'svelte';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';
	import { filterOptionsBySearch } from '../../_utils/filter-options.js';

	/**
	 * @typedef {import('../../_utils/filter-options.js').FilterOption} FilterOption
	 * @typedef {{ selected: boolean, indeterminate: boolean, isChild: boolean }} RowState
	 */

	/**
	 * Tri-state hierarchical checkbox list, shared by the desktop dropdown
	 * panels and the mobile filter sheet. Only leaf values live in `selected`;
	 * clicking a parent emits the array of its (visible) child values.
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

	// Flat lists (no parents anywhere) skip the chevron-width spacer — the
	// indent only exists to align childless rows with sibling parents.
	let anyChildren = $derived(
		visibleOptions.some((opt) => !!(opt.children && opt.children.length > 0))
	);

	/**
	 * While searching every visible parent is treated as expanded so matches stay visible.
	 * @param {string} value
	 */
	function isExpanded(value) {
		return isSearching || !!expandedState[value];
	}

	/**
	 * Handle option selection. Parents pass the (search-pruned) option so
	 * toggling only affects the visible children.
	 * @param {string} value
	 * @param {FilterOption} [parentOption]
	 */
	function handleSelect(value, parentOption) {
		if (parentOption?.children && parentOption.children.length > 0) {
			const childValues = parentOption.children.map((c) => c.value);
			onchange?.(childValues, isMetaPressed);
		} else {
			onchange?.(value, isMetaPressed);
		}
	}

	/**
	 * @param {FilterOption} opt
	 * @returns {boolean}
	 */
	function areAllChildrenSelected(opt) {
		if (!opt.children || opt.children.length === 0) return false;
		return opt.children.every((child) => selected.includes(child.value));
	}

	/**
	 * @param {FilterOption} opt
	 * @returns {boolean}
	 */
	function areSomeChildrenSelected(opt) {
		if (!opt.children || opt.children.length === 0) return false;
		const selectedCount = opt.children.filter((child) => selected.includes(child.value)).length;
		return selectedCount > 0 && selectedCount < opt.children.length;
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

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<ul class="flex flex-col text-sm">
	{#each visibleOptions as opt (opt.value)}
		{@const hasChildren = !!(opt.children && opt.children.length > 0)}
		{@const allSelected = hasChildren ? areAllChildrenSelected(opt) : isSelected(opt.value)}
		{@const someSelected = hasChildren ? areSomeChildrenSelected(opt) : false}
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
				{:else if anyChildren}
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
						isChild: false
					})}
				</button>
			</div>

			{#if hasChildren && isExpanded(opt.value)}
				<!-- ml-12 places the guide line centred beneath the parent checkbox
				     (24px chevron + 4px gap + 8px button padding + 12px half-checkbox) -->
				<ul class="ml-12 pl-2 border-l border-warm-grey">
					{#each opt.children ?? [] as child (child.value)}
						<li class="whitespace-nowrap">
							<button
								type="button"
								class="w-full min-w-0 flex items-center gap-3 rounded-md text-dark-grey hover:bg-warm-grey cursor-pointer px-2 {dense
									? 'py-2'
									: 'py-2.5'}"
								onclick={() => handleSelect(child.value)}
							>
								{@render checkbox(isSelected(child.value), false)}
								{@render (row ?? defaultRow)(child, {
									selected: isSelected(child.value),
									indeterminate: false,
									isChild: true
								})}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</li>
	{/each}
</ul>
