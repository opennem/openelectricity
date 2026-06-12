<script>
	import { fly } from 'svelte/transition';
	import { Slider } from 'bits-ui';

	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';

	/**
	 * @typedef {Object} Props
	 * @property {number} value - minimum significance (0 = all records)
	 * @property {string} [paddingY]
	 * @property {string} [paddingX]
	 * @property {boolean} [staticDisplay]
	 * @property {string} [position] - top, bottom
	 * @property {string} [align] - left, right
	 * @property {(value: number) => void} [onchange]
	 */

	/** @type {Props} */
	let {
		value = 0,
		paddingY = 'py-1',
		paddingX = 'px-2',
		staticDisplay = false,
		position = 'bottom',
		align = 'left',
		onchange
	} = $props();

	let showOptions = $state(false);

	/** @type {HTMLElement | undefined} */
	let triggerRef = $state();
	/** @type {HTMLElement | undefined} */
	let dropdownRef = $state();

	// Local state for immediate UI feedback — follows `value`, can be overridden
	// by drag handlers until the next prop change or commit.
	let localValue = $derived(value);

	let displayLabel = $derived(localValue > 0 ? `Significance ${localValue}+` : 'Significance');
	let valueLabel = $derived(localValue > 0 ? `${localValue} and above` : 'All records');

	function handleDocumentClick(/** @type {MouseEvent} */ e) {
		const target = /** @type {Node} */ (e.target);
		if (triggerRef?.contains(target) || dropdownRef?.contains(target)) return;
		showOptions = false;
	}

	function handleScroll() {
		showOptions = false;
	}
</script>

{#snippet slider()}
	<div class="flex items-center justify-between text-sm">
		<span class="text-mid-grey">Minimum significance</span>
		<span class="font-mono text-dark-grey">{valueLabel}</span>
	</div>

	<Slider.Root
		type="single"
		min={0}
		max={10}
		step={1}
		value={localValue}
		onValueChange={(v) => (localValue = v)}
		onValueCommit={(v) => onchange?.(v)}
		class="relative flex w-full touch-none select-none items-center h-4"
	>
		<span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-warm-grey">
			<Slider.Range class="absolute h-full bg-dark-grey" />
		</span>

		<Slider.Thumb
			index={0}
			class="block size-4 rounded-full border-2 border-dark-grey bg-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-grey focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing"
		/>
	</Slider.Root>

	<div class="flex justify-between text-xs text-mid-grey">
		<span>All</span>
		<span>10</span>
	</div>
{/snippet}

<svelte:window onscroll={handleScroll} />
<svelte:document onclick={handleDocumentClick} />

<div class="relative w-full text-sm lg:text-base">
	{#if staticDisplay}
		<div class="flex items-center justify-between {paddingX} {paddingY} mb-2 text-sm">
			<span class="font-semibold mb-0 capitalize">Significance</span>
		</div>

		<div class="flex flex-col gap-2 mt-1">
			{@render slider()}
		</div>
	{:else}
		<div
			bind:this={triggerRef}
			role="button"
			tabindex="0"
			onclick={() => (showOptions = !showOptions)}
			onkeydown={(e) => e.key === 'Enter' && (showOptions = !showOptions)}
			class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg whitespace-nowrap cursor-pointer"
			class:hover:bg-warm-grey={!showOptions}
		>
			<span class="font-semibold mb-0 capitalize text-sm lg:text-base">
				{displayLabel}
			</span>

			<IconChevronUpDown class="w-7 h-7" />
		</div>

		{#if showOptions}
			<div
				bind:this={dropdownRef}
				use:portal
				use:dropdownPosition={{ trigger: triggerRef, align, position }}
				class="border border-mid-grey bg-white fixed flex flex-col gap-2 rounded-lg z-50 shadow-md p-6 text-sm w-72"
				in:fly={{ y: -5, duration: 150 }}
				out:fly={{ y: -5, duration: 150 }}
			>
				{@render slider()}
			</div>
		{/if}
	{/if}
</div>
