<script>
	/**
	 * StaticZoomButtons — the flat − / + pair used in chart headers and any
	 * other store-free surface (the comparison stripes). Disabled at the
	 * zoom limits the caller reports.
	 */
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/** @type {{ onzoomin?: () => void, onzoomout?: () => void, isAtMinZoom?: boolean, isAtMaxZoom?: boolean }} */
	let { onzoomin, onzoomout, isAtMinZoom = false, isAtMaxZoom = false } = $props();
</script>

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
