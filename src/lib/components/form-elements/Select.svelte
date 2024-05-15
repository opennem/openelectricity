<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import IconCheckMark from '$lib/icons/CheckMark.svelte';

	export let selected;
	export let options = [];

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
		class="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-warm-grey"
	>
		<h5 class="font-medium mb-0 capitalize">
			{selected && selected.label ? selected?.label : findSelectedOption()}
		</h5>
		<IconChevronUpDown class="w-7 h-7" />
	</button>

	{#if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col gap-2 w-full rounded-lg z-20 shadow-md p-2"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			{#each options as opt}
				<li>
					<button
						class="hover:bg-warm-grey w-full rounded-md py-2 pl-4 pr-6 flex gap-2 items-center justify-between"
						on:click={() => handleSelect(opt)}
					>
						<span class="capitalize">{opt.label}</span>
						{#if selectedValue === opt.value}
							<IconCheckMark class="w-7 h-7 text-dark-grey" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
