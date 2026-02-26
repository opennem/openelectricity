<script>
	import { fly } from 'svelte/transition';

	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} selected
	 * @property {{label: string, value: string | number | null | undefined, labelClassName?: string, divider?: boolean}[] | undefined} [options]
	 * @property {string} [paddingY]
	 * @property {string} [paddingX]
	 * @property {string} [selectedLabelClass]
	 * @property {string} [formLabel]
	 * @property {boolean} [staticDisplay]
	 * @property {string} [position] - top, bottom
	 * @property {string} [align] - left, right, middle
	 * @property {string} [widthClass]
	 * @property {(option: {label: string, value: string | number | null | undefined}) => void} [onchange]
	 */

	/** @type {Props} */
	let {
		selected,
		options = [],
		paddingY = 'py-1',
		paddingX = 'px-2',
		selectedLabelClass = 'font-semibold',
		formLabel = '',
		staticDisplay = false,
		position = 'bottom',
		align = 'left',
		widthClass = 'w-full',
		onchange
	} = $props();

	let showOptions = $state(false);
	let selectedValue = $derived(selected && selected.value ? selected.value || selected : selected);

	/** @type {HTMLElement | undefined} */
	let triggerRef = $state();
	/** @type {HTMLElement | undefined} */
	let dropdownRef = $state();

	function handleDocumentClick(/** @type {MouseEvent} */ e) {
		const target = /** @type {Node} */ (e.target);
		if (triggerRef?.contains(target) || dropdownRef?.contains(target)) return;
		showOptions = false;
	}

	/**
	 * @param {{label: string, value: string | number | null | undefined}} option
	 */
	function handleSelect(option) {
		onchange?.(option);
		showOptions = false;
	}

	function findSelectedOption() {
		const find = options.find((opt) => opt.value === selectedValue);
		return find ? find.label : selectedValue || formLabel;
	}

	let translateToMiddle = $derived(align === 'middle' ? 'left-1/2 transform -translate-x-1/2' : '');
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="relative {widthClass} text-sm lg:text-base">
	<button
		bind:this={triggerRef}
		onclick={() => (showOptions = !showOptions)}
		class="flex items-center gap-2 {paddingX} {paddingY} rounded-lg"
		class:hover:bg-warm-grey={!staticDisplay}
	>
		{#if staticDisplay}
			<span class="{selectedLabelClass} font-space text-sm">{formLabel}</span>
		{:else}
			<span class="{selectedLabelClass} mb-0 capitalize">
				{selected && selected.label ? selected?.label : findSelectedOption() || formLabel}
			</span>

			<IconChevronUpDown class="w-7 h-7" />
		{/if}
	</button>

	{#if staticDisplay}
		<ul class="flex flex-col mt-1">
			{#each options as opt, i (i)}
				{#if opt.divider}
					<li class="whitespace-nowrap">
						<div class="w-full h-px bg-warm-grey"></div>
					</li>
				{:else}
					<li class="whitespace-nowrap border-b border-warm-grey">
						<button
							class="w-full px-0 py-1 flex gap-4 items-center text-sm"
							class:text-mid-grey={selectedValue !== opt.value}
							class:text-black={selectedValue === opt.value}
							onclick={() => handleSelect(opt)}
						>
							<RadioBigButton radioOnly={true} checked={selectedValue === opt.value} />
							<span class="capitalize">{opt.label}</span>
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	{:else if showOptions}
		<ul
			bind:this={dropdownRef}
			use:portal
			use:dropdownPosition={{ trigger: triggerRef, align, position }}
			class="border border-mid-grey bg-white fixed flex flex-col rounded-lg z-50 shadow-md p-2 text-sm max-h-[450px] overflow-y-scroll"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			{#each options as opt, i (i)}
				{#if opt.divider}
					<li class="whitespace-nowrap">
						<div class="w-full h-px bg-warm-grey"></div>
					</li>
				{:else}
					<li class="whitespace-nowrap">
						<button
							class="hover:bg-warm-grey w-full rounded-md px-4 py-2 flex gap-16 items-center justify-between"
							class:text-mid-grey={selectedValue !== opt.value}
							class:text-black={selectedValue === opt.value}
							onclick={() => handleSelect(opt)}
						>
							<span class="capitalize {opt.labelClassName}">{opt.label}</span>

							<RadioBigButton radioOnly={true} checked={selectedValue === opt.value} />
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>
