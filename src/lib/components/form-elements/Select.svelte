<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';

	export let selected;
	/** @type {{label: string, value: string}[]} */
	export let options = [];
	export let paddingY = 'py-1';
	export let paddingX = 'px-2';
	export let selectedLabelClass = 'font-semibold';
	export let formLabel = '';
	export let staticDisplay = false;
	export let position = 'bottom'; // top, bottom
	export let align = 'left'; // left, right, middle
	export let widthClass = 'w-full';

	const dispatch = createEventDispatcher();

	let showOptions = false;

	$: selectedValue = selected && selected.value ? selected.value || selected : selected;

	function handleSelect(option) {
		dispatch('change', option);
		showOptions = false;
	}

	function findSelectedOption() {
		const find = options.find((opt) => opt.value === selectedValue);
		return find ? find.label : selectedValue || formLabel;
	}

	$: translateToMiddle = align === 'middle' ? 'left-1/2 transform -translate-x-1/2' : '';
</script>

<div class="relative {widthClass}">
	<button
		on:click={() => (showOptions = !showOptions)}
		use:clickoutside
		on:clickoutside={() => (showOptions = false)}
		class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg"
		class:hover:bg-warm-grey={!staticDisplay}
	>
		{#if staticDisplay}
			<span class={selectedLabelClass}>{formLabel}</span>
		{:else}
			<span class="{selectedLabelClass} mb-0 capitalize">
				{selected && selected.label ? selected?.label : findSelectedOption() || formLabel}
			</span>

			<IconChevronUpDown class="w-7 h-7" />
		{/if}
	</button>

	{#if staticDisplay}
		<ul class="flex flex-col mt-1">
			{#each options as opt}
				<li class="whitespace-nowrap border-b border-warm-grey">
					<button
						class="w-full px-0 py-1 flex gap-4 items-center"
						class:text-mid-grey={selectedValue !== opt.value}
						class:text-black={selectedValue === opt.value}
						on:click={() => handleSelect(opt)}
					>
						<RadioBigButton radioOnly={true} checked={selectedValue === opt.value} />
						<span class="capitalize">{opt.label}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col rounded-lg z-50 shadow-md p-2 text-sm max-h-96 overflow-y-scroll {translateToMiddle}"
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
						class:text-mid-grey={selectedValue !== opt.value}
						class:text-black={selectedValue === opt.value}
						on:click={() => handleSelect(opt)}
					>
						<span class="capitalize">{opt.label}</span>

						<RadioBigButton radioOnly={true} checked={selectedValue === opt.value} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
