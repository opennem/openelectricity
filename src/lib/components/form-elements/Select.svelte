<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import IconCheckMark from '$lib/icons/CheckMark.svelte';

	export let selected;
	export let options = [];

	const dispatch = createEventDispatcher();

	let showOptions = false;

	function handleSelect(option) {
		dispatch('change', option);
		showOptions = false;
	}
</script>

<div class="relative">
	<button
		on:click={() => (showOptions = !showOptions)}
		class="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-warm-grey"
	>
		<h5 class="font-medium mb-0">{selected?.label}</h5>
		<IconChevronUpDown class="w-7 h-7" />
	</button>

	{#if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col gap-2 w-full rounded-lg z-10 shadow-md p-2"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			{#each options as opt}
				<li>
					<button
						class="hover:bg-warm-grey w-full rounded-md py-2 pl-4 pr-6 flex gap-2 items-center justify-between"
						on:click={() => handleSelect(opt)}
					>
						<span>{opt.label}</span>
						{#if selected && selected.value === opt.value}
							<IconCheckMark class="w-7 h-7 text-dark-grey" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
