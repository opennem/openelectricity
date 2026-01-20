<script>
	/**
	 * Chart Header Component
	 *
	 * Displays title, unit, and options toggle for a chart.
	 * Simplified from ChartHeaderWithContext - works directly with ChartStore.
	 */
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';
	import ChartControls from './ChartControls.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {boolean} [showOptions] - Whether to show the options button
	 * @property {string} [class] - Additional CSS classes
	 */

	/** @type {Props} */
	let { chart, showOptions: displayOptions = true, class: className = '' } = $props();

	let showOptions = $state(false);
</script>

<div class={className} use:clickoutside onclickoutside={() => (showOptions = false)}>
	<header
		class="bg-light-warm-grey px-1 h-[28px] flex align-bottom items-center relative z-20 border-warm-grey rounded-lg"
		class:rounded-bl-none={showOptions}
	>
		<div class="flex gap-1 items-center" class:pl-3={!displayOptions}>
			{#if displayOptions}
				<button
					class="text-mid-warm-grey hover:text-dark-grey"
					onclick={() => (showOptions = !showOptions)}
					aria-label="Toggle chart options"
				>
					<EllipsisVertical class="size-8" />
				</button>
			{/if}

			<div class="flex gap-2 items-baseline">
				<h6 class="m-0 leading-none">{chart.title}</h6>

				{#if chart.chartOptions.isDataTransformTypeProportion}
					<span class="font-light text-xs text-mid-grey">%</span>
				{:else if chart.chartOptions.allowPrefixSwitch}
					<button
						class="font-light text-xs text-mid-grey hover:underline"
						onclick={() => chart.chartOptions.cyclePrefix()}
					>
						{chart.chartOptions.displayUnit}
					</button>
				{:else if chart.chartOptions.displayUnit}
					<span class="font-light text-xs text-mid-grey">
						{chart.chartOptions.displayUnit}
					</span>
				{/if}
			</div>
		</div>
	</header>

	{#if showOptions}
		<div
			in:fly={{ y: -20, duration: 240 }}
			out:fly={{ y: -20, duration: 240 }}
			class="bg-white/60 shadow-inner rounded-b-lg absolute z-10 backdrop-blur-lg inset-shadow-sm"
		>
			<ChartControls {chart} />
		</div>
	{/if}
</div>
