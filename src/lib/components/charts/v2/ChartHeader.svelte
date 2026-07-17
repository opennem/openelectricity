<script>
	/**
	 * Chart Header Component
	 *
	 * Displays title, unit, and options toggle for a chart.
	 * Simplified from ChartHeaderWithContext - works directly with ChartStore.
	 */
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import Minus from '@lucide/svelte/icons/minus';
	import Move from '@lucide/svelte/icons/move';
	import Plus from '@lucide/svelte/icons/plus';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import ChartControls from './ChartControls.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {boolean} [showOptions] - Whether to show the options button
	 * @property {string} [class] - Additional CSS classes
	 * @property {(() => void)} [onzoomin] - When provided (with onzoomout), inline zoom buttons render at the right of the bar.
	 * @property {(() => void)} [onzoomout]
	 * @property {boolean} [isAtMinZoom]
	 * @property {boolean} [isAtMaxZoom]
	 * @property {boolean} [showPanZoomToggle] - Render the tap-to-engage pan/zoom toggle left of the zoom buttons, in the same flat icon-button style. While engaged the +/- buttons hide (wheel zoom covers them) and the toggle shows the active state.
	 * @property {boolean} [panZoomEngaged] - Engagement state for the toggle.
	 * @property {(() => void)} [onpanzoomtoggle] - Toggle engagement.
	 */

	/** @type {Props} */
	let {
		chart,
		showOptions: displayOptions = true,
		class: className = '',
		onzoomin,
		onzoomout,
		isAtMinZoom = false,
		isAtMaxZoom = false,
		showPanZoomToggle = false,
		panZoomEngaged = false,
		onpanzoomtoggle
	} = $props();

	let showOptions = $state(false);
	let showZoomButtons = $derived(Boolean(onzoomin && onzoomout));
</script>

<div class={className} use:clickoutside onclickoutside={() => (showOptions = false)}>
	<header
		class="bg-light-warm-grey/75 px-3 h-[28px] flex align-bottom items-center justify-between relative z-20 border-b border-mid-warm-grey/40"
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
				<h6 class="m-0 leading-none font-space uppercase text-xs font-normal">{chart.title}</h6>

				{#if chart.chartOptions.isDataTransformTypeProportion}
					<span class="font-space font-light text-xxs text-mid-grey">%</span>
				{:else if chart.chartOptions.allowPrefixSwitch}
					<button
						class="font-space font-light text-xxs text-mid-grey hover:underline"
						onclick={() => chart.chartOptions.cyclePrefix()}
					>
						{chart.chartOptions.displayUnit}
					</button>
				{:else if chart.chartOptions.displayUnit}
					<span class="font-space font-light text-xxs text-mid-grey">
						{chart.chartOptions.displayUnit}
					</span>
				{/if}
			</div>
		</div>

		{#if showZoomButtons || showPanZoomToggle}
			<div class="flex items-center gap-0.5 -mr-1">
				{#if showPanZoomToggle}
					<Tooltip
						text={panZoomEngaged ? 'Done (Esc)' : 'Enable pan & zoom — drag to pan, scroll to zoom'}
						class="inline-flex"
					>
						<button
							class="p-1 rounded transition-colors {panZoomEngaged
								? 'bg-dark-grey text-white hover:bg-black'
								: 'text-mid-grey hover:text-dark-grey hover:bg-warm-grey'}"
							onclick={onpanzoomtoggle}
							aria-label={panZoomEngaged ? 'Disable pan and zoom' : 'Enable pan and zoom'}
							aria-pressed={panZoomEngaged}
						>
							<Move size={12} />
						</button>
					</Tooltip>
				{/if}

				{#if showZoomButtons && !panZoomEngaged}
					{#if showPanZoomToggle}
						<div class="mx-0.5 h-4 w-px bg-mid-warm-grey/60" aria-hidden="true"></div>
					{/if}
					<Tooltip text="Zoom out" class="inline-flex">
						<button
							class="p-1 rounded transition-colors {isAtMaxZoom
								? 'text-mid-warm-grey cursor-not-allowed'
								: 'text-mid-grey hover:text-dark-grey hover:bg-warm-grey'}"
							onclick={onzoomout}
							disabled={isAtMaxZoom}
							aria-label="Zoom out"
						>
							<Minus size={12} />
						</button>
					</Tooltip>
					<Tooltip text="Zoom in" class="inline-flex">
						<button
							class="p-1 rounded transition-colors {isAtMinZoom
								? 'text-mid-warm-grey cursor-not-allowed'
								: 'text-mid-grey hover:text-dark-grey hover:bg-warm-grey'}"
							onclick={onzoomin}
							disabled={isAtMinZoom}
							aria-label="Zoom in"
						>
							<Plus size={12} />
						</button>
					</Tooltip>
				{/if}
			</div>
		{/if}
	</header>

	{#if showOptions}
		<div
			in:fly={{ y: -20, duration: 240 }}
			out:fly={{ y: -20, duration: 240 }}
			class="bg-white/70 rounded-b-lg absolute z-10 backdrop-blur-md backdrop-saturate-150 border border-mid-warm-grey/40"
		>
			<ChartControls {chart} />
		</div>
	{/if}
</div>
