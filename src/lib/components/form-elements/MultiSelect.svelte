<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import { X } from '@lucide/svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} selected
	 * @property {string} [label]
	 * @property {{label: string, value: string | number | null | undefined, labelClassName?: string, divider?: boolean, colour?: string}[] | undefined} [options]
	 * @property {string} [paddingY]
	 * @property {string} [paddingX]
	 * @property {boolean} [staticDisplay]
	 * @property {string} [selectedLabelClass]
	 * @property {string} [position] - top, bottom
	 * @property {string} [align] - left, right
	 * @property {boolean} [withColours]
	 * @property {(value: string, isMetaPressed: boolean) => void} [onchange]
	 * @property {() => void} [onclear]
	 */

	/** @type {Props} */
	let {
		selected,
		label = '',
		options = [],
		paddingY = 'py-1',
		paddingX = 'px-2',
		staticDisplay = false,
		selectedLabelClass = 'font-semibold mb-0 capitalize',
		position = 'bottom',
		align = 'left',
		withColours = false,
		onchange,
		onclear
	} = $props();

	let hasSelection = $derived(selected.length > 0);

	/**
	 * Handle clear button click
	 * @param {MouseEvent} e
	 */
	function handleClear(e) {
		e.stopPropagation();
		onclear?.();
	}

	let showOptions = $state(false);
	let isMetaPressed = false;

	// Show the selected option's label when only 1 is selected
	let displayLabel = $derived.by(() => {
		if (selected.length === 1 && options) {
			const selectedOption = options.find((opt) => opt.value === selected[0]);
			if (selectedOption) {
				return selectedOption.label;
			}
		}
		return label;
	});

	/**
	 * @param {*} option
	 */
	function handleSelect(option) {
		onchange?.(option.value, isMetaPressed);
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

		// Reset meta key after 2 seconds
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
	<div
		role="button"
		tabindex="0"
		onclick={() => (showOptions = !showOptions)}
		onkeydown={(e) => e.key === 'Enter' && (showOptions = !showOptions)}
		class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg whitespace-nowrap cursor-pointer"
		class:hover:bg-warm-grey={!showOptions}
	>
		<span class={selectedLabelClass}>
			{displayLabel}
		</span>

		{#if !staticDisplay}
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
		{/if}
	</div>

	{#if staticDisplay}
		<ul class="flex flex-col mt-1">
			{#each options as opt}
				{#if opt.divider}
					<li class="whitespace-nowrap">
						<div class="w-full h-px bg-warm-grey"></div>
					</li>
				{:else}
					<li class="whitespace-nowrap border-b border-warm-grey">
						<button
							class="w-full px-0 py-1 flex gap-4 items-center"
							class:text-mid-grey={!selected.includes(opt.value)}
							class:text-black={selected.includes(opt.value)}
							onclick={() => handleSelect(opt)}
						>
							<div
								class="border rounded-sm size-7"
								class:border-mid-warm-grey={!selected.includes(opt.value)}
								class:border-dark-grey={selected.includes(opt.value)}
								class:bg-warm-grey={selected.includes(opt.value)}
							>
								{#if selected.includes(opt.value)}
									<IconCheckMark class="size-6" />
								{/if}
							</div>

							{#if withColours}
								<span class="size-4 rounded-full" style="background-color: {opt.colour}"></span>
							{/if}

							<span class="capitalize">{opt.label}</span>
						</button>
					</li>
				{/if}
			{/each}
			{#if hasSelection && onclear}
				<li class="whitespace-nowrap pt-2">
					<button
						class="text-mid-grey hover:text-dark-grey text-sm"
						onclick={handleClear}
					>
						Clear all
					</button>
				</li>
			{/if}
		</ul>
	{:else if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col rounded-lg z-50 shadow-md p-2 text-sm max-h-[500px] overflow-y-scroll"
			class:top-16={position === 'bottom'}
			class:bottom-16={position === 'top'}
			class:left-0={align === 'left'}
			class:right-0={align === 'right'}
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			{#each options as opt}
				{#if opt.divider}
					<li class="whitespace-nowrap">
						<div class="w-full h-px bg-warm-grey"></div>
					</li>
				{:else}
					<li class="whitespace-nowrap">
						<button
							class="hover:bg-warm-grey w-full rounded-md px-4 py-2 flex gap-16 items-center justify-between"
							class:text-mid-grey={!selected.includes(opt.value)}
							class:text-black={selected.includes(opt.value)}
							onclick={() => handleSelect(opt)}
						>
							<div class="flex items-center gap-4">
								{#if withColours}
									<span class="size-4 rounded-full" style="background-color: {opt.colour}"></span>
								{/if}
								<span class="capitalize">{opt.label}</span>
							</div>

							<div
								class="border rounded-sm size-7"
								class:border-mid-warm-grey={!selected.includes(opt.value)}
								class:border-dark-grey={selected.includes(opt.value)}
								class:bg-warm-grey={selected.includes(opt.value)}
							>
								{#if selected.includes(opt.value)}
									<IconCheckMark class="size-6" />
								{/if}
							</div>
						</button>
					</li>
				{/if}
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
