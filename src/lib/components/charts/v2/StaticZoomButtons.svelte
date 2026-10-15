<script>
	/**
	 * StaticZoomButtons — the flat − / + pair used in chart headers and any
	 * other store-free surface (the comparison stripes). Disabled at the
	 * zoom limits the caller reports. `size="md"` matches a chart card
	 * header's 28px icon buttons.
	 */
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/** @type {{ onzoomin?: () => void, onzoomout?: () => void, isAtMinZoom?: boolean, isAtMaxZoom?: boolean, size?: 'sm' | 'md' }} */
	let { onzoomin, onzoomout, isAtMinZoom = false, isAtMaxZoom = false, size = 'sm' } = $props();

	let box = $derived(
		size === 'md' ? 'inline-flex size-[28px] items-center justify-center rounded-md' : 'p-1 rounded'
	);
	let iconSize = $derived(size === 'md' ? 15 : 12);
</script>

<Tooltip text="Zoom out" class="inline-flex">
	<button
		class="{box} touch-hit transition-colors {isAtMaxZoom
			? 'text-mid-warm-grey cursor-not-allowed'
			: 'text-mid-grey hover:text-dark-grey hover:bg-warm-grey'}"
		onclick={onzoomout}
		disabled={isAtMaxZoom}
		aria-label="Zoom out"
	>
		<Minus size={iconSize} />
	</button>
</Tooltip>
<Tooltip text="Zoom in" class="inline-flex">
	<button
		class="{box} touch-hit transition-colors {isAtMinZoom
			? 'text-mid-warm-grey cursor-not-allowed'
			: 'text-mid-grey hover:text-dark-grey hover:bg-warm-grey'}"
		onclick={onzoomin}
		disabled={isAtMinZoom}
		aria-label="Zoom in"
	>
		<Plus size={iconSize} />
	</button>
</Tooltip>
