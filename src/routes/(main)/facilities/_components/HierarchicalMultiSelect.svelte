<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';
	import { X } from '@lucide/svelte';

	/**
	 * @typedef {Object} OptionChild
	 * @property {string} value
	 * @property {string} label
	 * @property {string} [colour]
	 */

	/**
	 * @typedef {Object} Option
	 * @property {string} value
	 * @property {string} label
	 * @property {string} [colour]
	 * @property {OptionChild[]} [children]
	 */

	/**
	 * @typedef {Object} Props
	 * @property {Option[]} options
	 * @property {string[]} selected
	 * @property {string} [label]
	 * @property {boolean} [staticDisplay]
	 * @property {string} [paddingX]
	 * @property {string} [paddingY]
	 * @property {(value: string | string[], isMetaPressed: boolean) => void} [onchange]
	 * @property {() => void} [onclear]
	 */

	/** @type {Props} */
	let {
		options = [],
		selected = [],
		label = '',
		staticDisplay = false,
		paddingX = 'px-2',
		paddingY = 'py-1',
		onchange,
		onclear
	} = $props();

	let showOptions = $state(false);
	let isMetaPressed = $state(false);

	/** @type {Record<string, boolean>} */
	let expandedState = $state({});

	let hasSelection = $derived(selected.length > 0);

	// Show the selected option's label when only 1 is selected
	let displayLabel = $derived.by(() => {
		if (selected.length === 1 && options) {
			// Check parent options
			const selectedParent = options.find((opt) => opt.value === selected[0]);
			if (selectedParent) {
				return selectedParent.label;
			}
			// Check children
			for (const opt of options) {
				if (opt.children) {
					const selectedChild = opt.children.find((child) => child.value === selected[0]);
					if (selectedChild) {
						return selectedChild.label;
					}
				}
			}
		}
		return label;
	});

	/**
	 * Handle clear button click
	 * @param {MouseEvent} e
	 */
	function handleClear(e) {
		e.stopPropagation();
		onclear?.();
	}

	/**
	 * Handle option selection
	 * @param {string} value
	 * @param {Option} [parentOption] - If provided, this is a parent option with children
	 */
	function handleSelect(value, parentOption) {
		// If it's a parent option with children, toggle all children
		if (parentOption?.children && parentOption.children.length > 0) {
			const childValues = parentOption.children.map((c) => c.value);
			onchange?.(childValues, isMetaPressed);
		} else {
			onchange?.(value, isMetaPressed);
		}
	}

	/**
	 * Check if all children of a parent are selected
	 * @param {Option} opt
	 * @returns {boolean}
	 */
	function areAllChildrenSelected(opt) {
		if (!opt.children || opt.children.length === 0) return false;
		return opt.children.every((child) => selected.includes(child.value));
	}

	/**
	 * Check if some (but not all) children of a parent are selected
	 * @param {Option} opt
	 * @returns {boolean}
	 */
	function areSomeChildrenSelected(opt) {
		if (!opt.children || opt.children.length === 0) return false;
		const selectedCount = opt.children.filter((child) => selected.includes(child.value)).length;
		return selectedCount > 0 && selectedCount < opt.children.length;
	}

	/**
	 * Toggle expanded state for a parent option
	 * @param {MouseEvent} e
	 * @param {string} value
	 */
	function toggleExpanded(e, value) {
		e.stopPropagation();
		expandedState[value] = !expandedState[value];
	}

	/**
	 * Check if an option is selected
	 * @param {string} value
	 * @returns {boolean}
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

	function handleScroll() {
		showOptions = false;
	}
</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} onscroll={handleScroll} />

<div
	class="relative w-full text-base"
	use:clickoutside
	onclickoutside={() => (showOptions = false)}
>
	{#if !staticDisplay}
		<div
			role="button"
			tabindex="0"
			onclick={() => (showOptions = !showOptions)}
			onkeydown={(e) => e.key === 'Enter' && (showOptions = !showOptions)}
			class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg whitespace-nowrap cursor-pointer"
			class:hover:bg-warm-grey={!showOptions}
		>
			<span class="font-semibold mb-0 capitalize">
				{displayLabel}
			</span>

			<div class="flex items-center gap-1">
				{#if hasSelection && onclear}
					<button
						onclick={handleClear}
						class="p-1 rounded-full hover:bg-mid-warm-grey transition-colors"
						title="Clear selection"
					>
						<X class="size-4 text-mid-grey" />
					</button>
				{/if}
				<IconChevronUpDown class="w-7 h-7" />
			</div>
		</div>
	{/if}

	{#if staticDisplay}
		<ul class="flex flex-col mt-1">
			{#each options as opt (opt.value)}
				{@const hasChildren = opt.children && opt.children.length > 0}
				{@const allSelected = hasChildren ? areAllChildrenSelected(opt) : isSelected(opt.value)}
				{@const someSelected = hasChildren ? areSomeChildrenSelected(opt) : false}
				<li class="whitespace-nowrap border-b border-warm-grey">
					<div class="flex items-center gap-2">
						{#if hasChildren}
							<button
								onclick={(e) => toggleExpanded(e, opt.value)}
								class="p-1 rounded hover:bg-warm-grey transition-transform"
							>
								<IconChevronDown
									class="size-4 transition-transform duration-200"
									style="transform: rotate({expandedState[opt.value] ? '0deg' : '-90deg'})"
								/>
							</button>
						{:else}
							<div class="w-6"></div>
						{/if}

						<button
							class="flex-1 py-1 flex gap-4 items-center"
							class:text-mid-grey={!allSelected && !someSelected}
							class:text-black={allSelected || someSelected}
							onclick={() => handleSelect(opt.value, hasChildren ? opt : undefined)}
						>
							<div
								class="border rounded-sm size-7 flex items-center justify-center"
								class:border-mid-warm-grey={!allSelected && !someSelected}
								class:border-dark-grey={allSelected || someSelected}
								class:bg-warm-grey={allSelected}
							>
								{#if allSelected}
									<IconCheckMark class="size-5" />
								{:else if someSelected}
									<div class="w-3 h-0.5 bg-dark-grey"></div>
								{/if}
							</div>

							{#if opt.colour}
								<span class="size-4 rounded-sm" style="background-color: {opt.colour}"></span>
							{/if}

							<span class="capitalize">{opt.label}</span>
						</button>
					</div>

					{#if hasChildren && expandedState[opt.value]}
						<ul class="ml-[3.25rem] border-l-2 border-warm-grey">
							{#each opt.children as child (child.value)}
								<li class="whitespace-nowrap">
									<button
										class="w-full pl-4 py-1 flex gap-4 items-center"
										class:text-mid-grey={!isSelected(child.value)}
										class:text-black={isSelected(child.value)}
										onclick={() => handleSelect(child.value)}
									>
										<div
											class="border rounded-sm size-7 flex items-center justify-center"
											class:border-mid-warm-grey={!isSelected(child.value)}
											class:border-dark-grey={isSelected(child.value)}
											class:bg-warm-grey={isSelected(child.value)}
										>
											{#if isSelected(child.value)}
												<IconCheckMark class="size-5" />
											{/if}
										</div>

										{#if child.colour}
											<span class="size-4 rounded-sm" style="background-color: {child.colour}"
											></span>
										{/if}

										<span class="capitalize">{child.label}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
			{#if hasSelection && onclear}
				<li class="whitespace-nowrap pt-2">
					<button class="text-mid-grey hover:text-dark-grey text-sm" onclick={handleClear}>
						Clear all
					</button>
				</li>
			{/if}
		</ul>
	{:else if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col rounded-lg z-50 shadow-md p-2 text-sm max-h-[500px] overflow-y-auto left-0 top-16"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			{#each options as opt (opt.value)}
				{@const hasChildren = opt.children && opt.children.length > 0}
				{@const allSelected = hasChildren ? areAllChildrenSelected(opt) : isSelected(opt.value)}
				{@const someSelected = hasChildren ? areSomeChildrenSelected(opt) : false}
				<li class="whitespace-nowrap">
					<div class="flex items-center gap-1">
						{#if hasChildren}
							<button
								onclick={(e) => toggleExpanded(e, opt.value)}
								class="p-1 rounded hover:bg-warm-grey"
							>
								<IconChevronDown
									class="size-4 transition-transform duration-200"
									style="transform: rotate({expandedState[opt.value] ? '0deg' : '-90deg'})"
								/>
							</button>
						{:else}
							<div class="w-6"></div>
						{/if}

						<button
							class="flex-1 hover:bg-warm-grey rounded-md px-2 pl-4 py-2 flex gap-4 items-center"
							class:text-mid-grey={!allSelected && !someSelected}
							class:text-black={allSelected || someSelected}
							onclick={() => handleSelect(opt.value, hasChildren ? opt : undefined)}
						>
							<div
								class="border rounded-sm size-7 flex items-center justify-center"
								class:border-mid-warm-grey={!allSelected && !someSelected}
								class:border-dark-grey={allSelected || someSelected}
								class:bg-warm-grey={allSelected}
							>
								{#if allSelected}
									<IconCheckMark class="size-5" />
								{:else if someSelected}
									<div class="w-3 h-0.5 bg-dark-grey"></div>
								{/if}
							</div>

							{#if opt.colour}
								<span class="size-4 rounded-sm" style="background-color: {opt.colour}"></span>
							{/if}

							<span class="capitalize">{opt.label}</span>
						</button>
					</div>

					{#if hasChildren && expandedState[opt.value]}
						<ul class="ml-[3.25rem] border-l-1 border-warm-grey">
							{#each opt.children as child (child.value)}
								<li class="whitespace-nowrap">
									<button
										class="w-full hover:bg-warm-grey rounded-md pl-4 pr-2 py-2 flex gap-4 items-center"
										class:text-mid-grey={!isSelected(child.value)}
										class:text-black={isSelected(child.value)}
										onclick={() => handleSelect(child.value)}
									>
										<div
											class="border rounded-sm size-7 flex items-center justify-center"
											class:border-mid-warm-grey={!isSelected(child.value)}
											class:border-dark-grey={isSelected(child.value)}
											class:bg-warm-grey={isSelected(child.value)}
										>
											{#if isSelected(child.value)}
												<IconCheckMark class="size-5" />
											{/if}
										</div>

										{#if child.colour}
											<span class="size-4 rounded-sm" style="background-color: {child.colour}"
											></span>
										{/if}

										<span class="capitalize">{child.label}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
			{#if hasSelection && onclear}
				<li class="whitespace-nowrap border-t border-warm-grey mt-1 pt-1">
					<button
						class="hover:bg-warm-grey w-full rounded-md px-4 py-2 text-mid-grey hover:text-dark-grey text-left"
						onclick={handleClear}
					>
						Clear all
					</button>
				</li>
			{/if}
		</ul>
	{/if}
</div>
