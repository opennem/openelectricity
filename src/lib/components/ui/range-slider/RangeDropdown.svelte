<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { X } from '@lucide/svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RangeSlider from './RangeSlider.svelte';

	/**
	 * @type {{
	 *   min?: number,
	 *   max?: number,
	 *   value?: [number, number],
	 *   step?: number,
	 *   label?: string,
	 *   paddingX?: string,
	 *   paddingY?: string,
	 *   onchange?: (value: [number, number]) => void,
	 *   onclear?: () => void,
	 *   formatValue?: (value: number) => string
	 * }}
	 */
	let {
		min = 0,
		max = 100,
		value = [0, 100],
		step = 1,
		label = 'Range',
		paddingX = 'pl-5 pr-4',
		paddingY = 'py-3',
		onchange,
		onclear,
		formatValue = (v) => String(v)
	} = $props();

	let showDropdown = $state(false);

	let isFiltered = $derived(value[0] > min || value[1] < max);

	let displayLabel = $derived.by(() => {
		if (!isFiltered) return label;
		return `${formatValue(value[0])} – ${formatValue(value[1])}`;
	});

	/**
	 * Handle clear button click
	 * @param {MouseEvent} e
	 */
	function handleClear(e) {
		e.stopPropagation();
		onclear?.();
	}

	function handleScroll() {
		showDropdown = false;
	}
</script>

<svelte:window onscroll={handleScroll} />

<div
	class="relative text-base"
	use:clickoutside
	onclickoutside={() => (showDropdown = false)}
>
	<div
		role="button"
		tabindex="0"
		onclick={() => (showDropdown = !showDropdown)}
		onkeydown={(e) => e.key === 'Enter' && (showDropdown = !showDropdown)}
		class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg whitespace-nowrap cursor-pointer"
		class:hover:bg-warm-grey={!showDropdown}
	>
		<span class="font-semibold text-sm md:text-base">
			{displayLabel}
		</span>

		<div class="flex items-center gap-1">
			{#if isFiltered && onclear}
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

	{#if showDropdown}
		<div
			class="border border-mid-grey bg-white absolute top-14 left-0 flex flex-col rounded-lg z-50 shadow-md p-4 min-w-[250px]"
			transition:fly={{ y: -10, duration: 150 }}
		>
			<RangeSlider
				{min}
				{max}
				{value}
				{step}
				{onchange}
				{formatValue}
			/>
		</div>
	{/if}
</div>
