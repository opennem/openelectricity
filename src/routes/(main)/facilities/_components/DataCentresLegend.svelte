<script>
	import { STATUS_LABELS, DC_MARKER } from '$lib/facilities/data-centres.js';

	/**
	 * Legend for the data centres (loads) map layer — status buckets are encoded
	 * as fill opacity on the purple markers, so the chips mirror that.
	 *
	 * `raised` lifts the legend above the transmission-lines legend when both
	 * layers are visible (they share the bottom-right corner).
	 *
	 * @type {{
	 *   satelliteView?: boolean,
	 *   raised?: boolean
	 * }}
	 */
	let { satelliteView = false, raised = false } = $props();

	let fill = $derived(satelliteView ? DC_MARKER.satelliteFill : DC_MARKER.fill);

	// Mirrors the layer's status→opacity encoding via the shared DC_MARKER.
	// Retired is omitted — no retired site in the dataset has coordinates.
	const BUCKETS = /** @type {const} */ ([
		{ label: STATUS_LABELS.operating, opacity: DC_MARKER.statusOpacity.operating },
		{ label: STATUS_LABELS.construction, opacity: DC_MARKER.statusOpacity.construction },
		{ label: STATUS_LABELS.announced, opacity: DC_MARKER.statusOpacity.announced }
	]);
</script>

<div
	class="absolute right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs {raised
		? 'bottom-14'
		: 'bottom-4'}"
>
	<div class="flex items-center gap-3">
		<span class="font-medium text-dark-grey">Data centres</span>
		{#each BUCKETS as { label, opacity } (label)}
			<span class="flex items-center gap-1.5">
				<span
					class="w-3 h-3 rounded-full border-2"
					style="background-color: color-mix(in srgb, {fill} {opacity *
						100}%, transparent); border-color: {DC_MARKER.stroke};"
				></span>
				<span class="text-mid-grey">{label}</span>
			</span>
		{/each}
		<span class="text-mid-grey/60">sized by MW</span>
	</div>
</div>
