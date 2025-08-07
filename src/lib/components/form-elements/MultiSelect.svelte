<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} selected
	 * @property {string} [label]
	 * @property {{label: string, value: string | number | null | undefined, labelClassName?: string, divider?: boolean}[] | undefined} [options]
	 * @property {string} [paddingY]
	 * @property {string} [paddingX]
	 * @property {boolean} [staticDisplay]
	 * @property {string} [selectedLabelClass]
	 * @property {string} [position] - top, bottom
	 * @property {string} [align] - left, right
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
		align = 'left'
	} = $props();

	const dispatch = createEventDispatcher();

	let showOptions = $state(false);
	let isMetaPressed = false;

	/**
	 * @param {*} option
	 */
	function handleSelect(option) {
		dispatch('change', {
			value: option.value,
			isMetaPressed
		});
		// showOptions = false;
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
</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<div
	class="relative w-full text-base"
	use:clickoutside
	onclickoutside={() => (showOptions = false)}
>
	<button
		onclick={() => (showOptions = !showOptions)}
		class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg whitespace-nowrap"
		class:hover:bg-warm-grey={!showOptions}
	>
		<span class={selectedLabelClass}>
			{label}
		</span>

		{#if !staticDisplay}
			<IconChevronUpDown class="w-7 h-7" />
		{/if}
	</button>

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

							<span class="capitalize">{opt.label}</span>
						</button>
					</li>
				{/if}
			{/each}
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
							<span class="capitalize">{opt.label}</span>

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
		</ul>
	{/if}
</div>
