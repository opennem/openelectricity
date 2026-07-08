<script>
	import { X } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { Backdrop } from '$lib/components/ui/backdrop';

	/**
	 * FacilityMapLightbox — expanded, fully interactive facility map overlay.
	 *
	 * Opened by clicking the sidebar mini-map (see FacilityMediaPanel); mirrors
	 * the PhotoCarousel lightbox pattern (Backdrop + portalled fixed overlay).
	 * Hosts the same interactive FacilityMap the mobile Map tab uses (pan/zoom,
	 * base-style + transmission-line options, attribution), lazily imported so
	 * MapLibre initialises at its final size.
	 *
	 * @type {{
	 *   lat: number,
	 *   lng: number,
	 *   color?: string,
	 *   osmWayId?: string | number | null,
	 *   onclose?: () => void
	 * }}
	 */
	let { lat, lng, color = '#ffffff', osmWayId = null, onclose = undefined } = $props();
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose?.();
	}}
/>

<Backdrop open variant="lightbox" onclick={() => onclose?.()} duration={150} />

<div use:portal class="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
	<button
		type="button"
		class="absolute right-4 top-4 cursor-pointer text-white/70 hover:text-white pointer-events-auto"
		aria-label="Close map"
		onclick={() => onclose?.()}
	>
		<X size={24} />
	</button>

	<div class="h-[85vh] w-[90vw] overflow-hidden rounded-lg pointer-events-auto">
		{#await import('./FacilityMap.svelte') then { default: FacilityMap }}
			<FacilityMap {lat} {lng} {color} {osmWayId} />
		{/await}
	</div>
</div>
