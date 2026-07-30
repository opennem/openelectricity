<script>
	import { Info } from '@lucide/svelte';
	import { formatCapacity } from '$lib/utils/formatters.js';
	import {
		TRANSMISSION_BANDS,
		TRANSMISSION_SOURCE_HREF
	} from '$lib/facilities/transmission-bands.js';

	/**
	 * @typedef {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} Visibility
	 */

	/**
	 * Map key — what a mark on the facilities map stands for.
	 *
	 * The map draws a grid: facilities as graduated circles, transmission as a
	 * colour and weight ladder. Both channels share one card, one type scale and
	 * one heading treatment, but each takes the form its own encoding wants — the
	 * circles graduated by area, the voltages by colour and line weight. Both are
	 * laid out the same way — marks across on one baseline, values beneath,
	 * smallest first — so reading one teaches you the other. Units sit in the
	 * channel headings, leaving every value a bare numeral.
	 *
	 * The voltage marks double as the layer's band filter; the capacity marks are
	 * reference only. Each channel drops out with its layer, so a key with
	 * transmission switched off is just the capacity series.
	 *
	 * `capacityStops` must arrive ascending by value — `capacityLegendStops`
	 * returns them that way, and the largest is read off the end to scale the rest.
	 *
	 * @type {{
	 *   capacityStops?: { value: number, radius: number }[],
	 *   showTransmission?: boolean,
	 *   satelliteView?: boolean,
	 *   visibility?: Visibility,
	 *   onvisibilitychange?: (visibility: Visibility) => void
	 * }}
	 */
	let {
		capacityStops = [],
		showTransmission = false,
		satelliteView = false,
		visibility = { high: true, medium: true, low: true, lowest: true },
		onvisibilitychange
	} = $props();

	/** Cap on the largest reference circle (px radius). Circles scale down
	 *  together to stay under it, keeping the ratio between stops true. */
	const KEY_MAX_RADIUS = 10;

	/** Smallest circle that still reads as one (px). */
	const KEY_MIN_DIAMETER = 6;

	// Diameters snap to even whole pixels: a fractional one leaves the circle on a
	// half pixel once it's centred, and the browser then rounds width and height
	// apart — the smallest circle reads as an egg. Even keeps both the box and its
	// centring offset on the pixel grid.
	let circles = $derived.by(() => {
		if (!capacityStops.length) return [];
		// Stops arrive ascending, so the last is the largest.
		const scale = Math.min(1, KEY_MAX_RADIUS / capacityStops[capacityStops.length - 1].radius);
		return capacityStops.map((stop) => ({
			value: stop.value,
			diameter: Math.max(KEY_MIN_DIAMETER, Math.round(stop.radius * scale) * 2)
		}));
	});

	// Lowest voltage first for display — thin to thick, so the voltage series
	// grows in the same direction as the circles. The source table stays ordered
	// highest-first: the maps' `case` expressions index straight into it. Plain
	// const, not $derived — a frozen module constant has nothing to react to.
	const displayBands = [...TRANSMISSION_BANDS].reverse();

	/** @param {'high' | 'medium' | 'low' | 'lowest'} key */
	function toggleBand(key) {
		onvisibilitychange?.({ ...visibility, [key]: !visibility[key] });
	}
</script>

<!-- Both columns open with this row, so their first marks sit on one line. -->
{#snippet heading(/** @type {string} */ text, /** @type {string} */ unit)}
	<span class="text-[9px] uppercase tracking-wide text-mid-grey">
		{text}
		<!-- Units are case-sensitive — `normal-case` keeps kV off the uppercase. -->
		<span class="normal-case">({unit})</span>
	</span>
{/snippet}

{#if circles.length || showTransmission}
	<div class="flex gap-3 rounded-lg bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
		{#if circles.length}
			<div class="flex flex-col gap-2">
				<div class="flex h-3.5 items-center">
					{@render heading('Capacity', 'MW')}
				</div>
				<!-- A graduated series reads across, not down: the circles sit on one
				     baseline with each value under its own, so the sizes compare directly
				     side by side. `items-end` aligns the item boxes at the bottom, which —
				     labels being a fixed height — lands both the baseline and the label
				     line together. -->
				<div class="flex flex-1 items-end gap-3">
					{#each circles as circle (circle.value)}
						<div class="flex flex-col items-center gap-1 p-1">
							<!-- `aspect-square` derives the height from the width and `shrink-0`
							     keeps flex from compressing one axis, so the circle stays a circle
							     whatever the row does around it. -->
							<span
								class="block aspect-square shrink-0 rounded-full border border-mid-grey/60 bg-mid-grey/20"
								style="width: {circle.diameter}px;"
							></span>
							<span class="text-[10px] leading-none tabular-nums text-mid-grey">
								{formatCapacity(circle.value)}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if showTransmission}
			<div class="flex flex-col gap-2 {circles.length ? 'border-l border-mid-grey/20 pl-3' : ''}">
				<div class="flex h-3.5 items-center justify-between gap-2">
					{@render heading('Transmission', 'kV')}
					<a
						href={TRANSMISSION_SOURCE_HREF}
						target="_blank"
						rel="noopener noreferrer"
						title="Source: Digital Atlas of Australia"
						class="text-mid-grey/50 transition-colors hover:text-mid-grey"
					>
						<Info class="size-3.5" />
					</a>
				</div>
				<!-- The circles' idiom, mirrored: marks across on one baseline, values
				     beneath, thin to thick so both series grow the same way. `flex-1`
				     lets the shorter channel fall to the bottom of the card, putting
				     both label lines on one row across the divider. -->
				<div class="flex flex-1 items-end gap-3">
					{#each displayBands as band (band.key)}
						<button
							type="button"
							onclick={() => toggleBand(band.key)}
							aria-pressed={visibility[band.key]}
							aria-label="{band.label} kV lines"
							class="flex cursor-pointer flex-col items-center gap-4 rounded p-1 transition-colors hover:bg-light-warm-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-grey"
							class:opacity-30={!visibility[band.key]}
						>
							<!-- A line carries less visual mass than a circle, so it needs more
							     air under it than the capacity items do before its label reads as
							     belonging to it. Labels still meet across the divider — `items-end`
							     pins the item bottoms, so widening this gap only lifts the swatch. -->
							<span
								class="w-5 rounded-full"
								style="height: {band.width}px; background-color: {satelliteView
									? band.satelliteColour
									: band.colour};"
							></span>
							<span class="text-[10px] leading-none tabular-nums text-mid-grey">{band.label}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
