<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';
	import ChartOptions from './ChartOptions.svelte';

	let { store, displayOptions = true } = $props();

	// svelte-ignore state_referenced_locally
	const {
		title,
		allowPrefixSwitch,
		displayPrefix,
		displayUnit,
		isDataTransformTypeProportion,
		getNextPrefix
	} = store;

	let showOptions = $state(false);
</script>

<div use:clickoutside onclickoutside={() => (showOptions = false)}>
	<header
		class="bg-light-warm-grey px-1 h-[28px] flex align-bottom items-center relative z-20 border-warm-grey rounded-lg"
		class:rounded-bl-none={showOptions}
	>
		<div class="flex gap-1 items-center" class:pl-3={!displayOptions}>
			{#if displayOptions}
				<button
					class="text-mid-warm-grey hover:text-dark-grey"
					onclick={() => (showOptions = !showOptions)}
				>
					<EllipsisVertical class="size-8" />
				</button>
			{/if}

			<div class="flex gap-2 items-baseline top-px relative">
				<h6 class="m-0 leading-none">
					{$title}
				</h6>

				{#if $isDataTransformTypeProportion}
					<span class="font-light text-xs text-mid-grey">%</span>
				{:else if $allowPrefixSwitch}
					<button
						class="font-light text-xs text-mid-grey hover:underline"
						onclick={() => ($displayPrefix = getNextPrefix())}
					>
						{$displayUnit || ''}
					</button>
				{:else}
					<span class="font-light text-xs text-mid-grey">{$displayUnit || ''}</span>
				{/if}
			</div>
		</div>
	</header>

	{#if showOptions}
		<div
			in:fly={{ y: -20, duration: 240 }}
			out:fly={{ y: -20, duration: 240 }}
			class="bg-white/60 shadow-inner p-6 rounded-b-lg absolute z-10 backdrop-blur-lg inset-shadow-sm flex gap-6 flex-col"
		>
			<ChartOptions {store} />
		</div>
	{/if}
</div>
