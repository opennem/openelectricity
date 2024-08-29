<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';

	export let selected;
	export let options = [];
	export let paddingY = 'py-1';
	export let paddingX = 'px-2';
	export let selectedLabelClass = 'font-semibold';

	const dispatch = createEventDispatcher();

	let showOptions = false;

	$: selectedValue = selected && selected.value ? selected.value || selected : selected;

	function handleSelect(option) {
		dispatch('change', option);
		showOptions = false;
	}

	function findSelectedOption() {
		const find = options.find((opt) => opt.value === selectedValue);
		return find ? find.label : selectedValue;
	}
</script>

<div class="relative">
	<button
		on:click={() => (showOptions = !showOptions)}
		use:clickoutside
		on:clickoutside={() => (showOptions = false)}
		class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg hover:bg-warm-grey"
	>
		<span class="{selectedLabelClass} mb-0 capitalize">
			{selected && selected.label ? selected?.label : findSelectedOption()}
		</span>
		<IconChevronUpDown class="w-7 h-7" />
	</button>

	{#if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col rounded-lg z-50 shadow-md p-2 text-sm"
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
