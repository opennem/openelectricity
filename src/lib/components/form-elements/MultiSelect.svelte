<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import Checkbox from '$lib/components/form-elements/RadioBigButton.svelte';
	import { set } from 'date-fns';

	/** @type {string[]} */
	export let selected;
	export let label = '';
	/** @type {{label: string, value: string}[]} */
	export let options = [];
	export let paddingY = 'py-1';
	export let paddingX = 'px-2';
	export let staticDisplay = false;
	export let selectedLabelClass = 'font-semibold mb-0 capitalize';
	export let position = 'bottom'; // top, bottom
	export let align = 'left'; // left, right

	const dispatch = createEventDispatcher();

	let showOptions = false;
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

<svelte:window on:keyup={handleKeyup} on:keydown={handleKeydown} />

<div class="relative w-full" use:clickoutside on:clickoutside={() => (showOptions = false)}>
	<button
		on:click={() => (showOptions = !showOptions)}
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
				<li class="whitespace-nowrap border-b border-warm-grey">
					<button
						class="w-full px-0 py-1 flex gap-4 items-center"
						class:text-mid-grey={!selected.includes(opt.value)}
						class:text-black={selected.includes(opt.value)}
						on:click={() => handleSelect(opt)}
					>
						<div
							class="border rounded size-7"
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
				<li class="whitespace-nowrap">
					<button
						class="hover:bg-warm-grey w-full rounded-md px-4 py-2 flex gap-16 items-center justify-between"
						class:text-mid-grey={!selected.includes(opt.value)}
						class:text-black={selected.includes(opt.value)}
						on:click={() => handleSelect(opt)}
					>
						<span class="capitalize">{opt.label}</span>

						<div
							class="border rounded size-7"
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
			{/each}
		</ul>
	{/if}
</div>
