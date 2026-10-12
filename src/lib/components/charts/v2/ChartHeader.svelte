<script>
	/**
	 * Chart Header Component
	 *
	 * Displays title, unit, and options toggle for a chart.
	 * Simplified from ChartHeaderWithContext - works directly with ChartStore.
	 * Built from the pieces a hosting header (the tracker's chart cards)
	 * composes instead: `ChartOptionsMenu`, `ChartHeaderUnit` and
	 * `ChartPanZoomButtons`.
	 */
	import ChartHeaderUnit from './ChartHeaderUnit.svelte';
	import ChartOptionsMenu from './ChartOptionsMenu.svelte';
	import ChartPanZoomButtons from './ChartPanZoomButtons.svelte';

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

	let showZoomButtons = $derived(Boolean(onzoomin && onzoomout));
</script>

<div class={className}>
	<header
		class="bg-light-warm-grey/75 px-3 h-[28px] flex align-bottom items-center justify-between relative z-20 border-b border-mid-warm-grey/40"
	>
		<div class="flex gap-1 items-center" class:pl-3={!displayOptions}>
			{#if displayOptions}
				<ChartOptionsMenu {chart} />
			{/if}

			<div class="flex gap-2 items-baseline">
				<h6 class="m-0 leading-none font-space uppercase text-xs font-normal">{chart.title}</h6>
				<ChartHeaderUnit {chart} />
			</div>
		</div>

		{#if showZoomButtons || showPanZoomToggle}
			<div class="flex items-center gap-0.5 -mr-1">
				<ChartPanZoomButtons
					{onzoomin}
					{onzoomout}
					{isAtMinZoom}
					{isAtMaxZoom}
					{showPanZoomToggle}
					{panZoomEngaged}
					{onpanzoomtoggle}
				/>
			</div>
		{/if}
	</header>
</div>
