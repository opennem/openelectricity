<script>
	/**
	 * ChartZoomControls — absolute-positioned +/- buttons at the top-right of
	 * the chart container. Visible on hover (`group-hover:`) over a parent
	 * with the `group` class.
	 *
	 * Parents read back the element's measured width via `bind:width` so the
	 * floating tooltip can dodge the buttons (via StratumChart's
	 * `tooltipDodgeRightPx` prop).
	 */
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';

	/**
	 * @typedef {Object} Props
	 * @property {() => void} onzoomin
	 * @property {() => void} onzoomout
	 * @property {boolean} [isAtMinZoom] - When true, disables the zoom-in button
	 * @property {boolean} [isAtMaxZoom] - When true, disables the zoom-out button
	 * @property {number} [overlayInsetPx] - Horizontal inset (px) from the container's right edge
	 * @property {number} [width] - Bindable measured clientWidth for tooltip dodge
	 */

	/** @type {Props} */
	let {
		onzoomin,
		onzoomout,
		isAtMinZoom = false,
		isAtMaxZoom = false,
		overlayInsetPx = 0,
		width = $bindable(0)
	} = $props();
</script>

<div
	bind:clientWidth={width}
	class="absolute top-0 flex items-center gap-0.5 bg-white/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm border border-light-warm-grey opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-30"
	style:right="{overlayInsetPx}px"
>
	<button
		class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMaxZoom
			? 'text-mid-warm-grey cursor-not-allowed'
			: 'text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey'}"
		onclick={onzoomout}
		disabled={isAtMaxZoom}
		title="Zoom out"
	>
		<Minus size={14} />
	</button>
	<button
		class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMinZoom
			? 'text-mid-warm-grey cursor-not-allowed'
			: 'text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey'}"
		onclick={onzoomin}
		disabled={isAtMinZoom}
		title="Zoom in"
	>
		<Plus size={14} />
	</button>
</div>
