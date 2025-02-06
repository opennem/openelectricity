<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import getContext from '$lib/utils/get-context.js';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';
	import ChartOptionsWithContext from './ChartOptionsWithContext.svelte';

	/** @type {{ cxtKey: symbol, displayOptions: boolean }} */
	let { displayOptions = true, cxtKey } = $props();

	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);

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

			<div class="flex gap-2 items-baseline top-[1px] relative">
				<h6 class="m-0 leading-none">
					{cxt.title}
				</h6>

				{#if cxt.chartOptions.isDataTransformTypeProportion}
					<span class="font-light text-xs text-mid-grey">%</span>
				{:else if cxt.chartOptions.allowPrefixSwitch}
					<button
						class="font-light text-xs text-mid-grey hover:underline"
						onclick={() => (cxt.chartOptions.displayPrefix = cxt.getNextPrefix())}
					>
						{cxt.chartOptions.displayUnit || ''}
					</button>
				{:else}
					<span class="font-light text-xs text-mid-grey">{cxt.chartOptions.displayUnit || ''}</span>
				{/if}
			</div>
		</div>
	</header>

	{#if showOptions}
		<div
			in:fly={{ y: -20, duration: 240 }}
			out:fly={{ y: -20, duration: 240 }}
			class="bg-white/60 shadow-inner p-6 rounded-b-lg absolute z-10 backdrop-blur-lg inset-shadow flex gap-6 flex-col"
		>
			<ChartOptionsWithContext {cxtKey} />
		</div>
	{/if}
</div>
