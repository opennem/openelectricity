<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import IconCheckMark from '$lib/icons/CheckMark.svelte';

	export let selected;
	export let options = [];
	export let paddingY = 'py-1';
	export let paddingX = 'px-2';

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
		class="flex items-center gap-2 {paddingX} {paddingY} rounded-lg hover:bg-warm-grey"
	>
		<span class="font-semibold mb-0 capitalize">
			{selected && selected.label ? selected?.label : findSelectedOption()}
		</span>
		<IconChevronUpDown class="w-7 h-7" />
	</button>

	{#if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col gap-2 rounded-lg z-20 shadow-md p-2"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			{#each options as opt}
				<li class="whitespace-nowrap">
					<button
						class="hover:bg-warm-grey w-full rounded-md py-2 pl-4 pr-6 flex gap-2 items-center justify-between"
						on:click={() => handleSelect(opt)}
					>
						<span class="capitalize">{opt.label}</span>
						{#if selectedValue === opt.value}
							<IconCheckMark class="w-5 h-5 text-dark-grey" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
