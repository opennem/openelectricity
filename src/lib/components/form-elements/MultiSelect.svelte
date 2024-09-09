<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import Checkbox from '$lib/components/form-elements/RadioBigButton.svelte';

	/** @type {string[]} */
	export let selected;
	export let label = '';
	/** @type {{label: string, value: string}[]} */
	export let options = [];
	export let paddingY = 'py-1';
	export let paddingX = 'px-2';
	export let staticDisplay = false;
	export let selectedLabelClass = 'font-semibold mb-0 capitalize';

	const dispatch = createEventDispatcher();

	let showOptions = false;

	function handleSelect(option) {
		dispatch('change', option);
		// showOptions = false;
	}
</script>

<div class="relative w-full">
	<button
		on:click={() => (showOptions = true)}
		use:clickoutside
		on:clickoutside={() => (showOptions = false)}
		class="flex items-center gap-8 {paddingX} {paddingY} rounded-lg"
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
			class="border border-mid-grey bg-white absolute flex flex-col rounded-lg z-20 shadow-md p-2 text-sm"
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
