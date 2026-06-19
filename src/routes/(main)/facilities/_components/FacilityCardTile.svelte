<script>
	import FuelTechBadgeStack from '$lib/components/FuelTechBadgeStack.svelte';
	import { deriveCard, formatCardSubtitle } from '$lib/og/facility-card-data.js';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';

	/**
	 * Facilities card-grid tile. The social-card design rendered natively (no
	 * wordmark): the facility's Sanity photo when one is available, else a
	 * dominant-fuel-tech colour wash. Laid out at real size, so the fuel-tech
	 * badges and type are full-size (matching the List) rather than the scaled-
	 * down OG card.
	 *
	 * @type {{ facility: any, photoUrl?: string | null }}
	 */
	let { facility, photoUrl = null } = $props();

	let card = $derived(deriveCard(facility));
	// deriveCard already orders + dedupes the fuel techs canonically, and the tile
	// hides unit status, so the badge groups only need the fueltech id.
	let groups = $derived(card.fuelTechs.map((ft) => ({ fueltech_id: ft })));
	let subtitle = $derived(formatCardSubtitle(card));
	let dominantColour = $derived(getFueltechColor(card.dominant));
	// Photo tiles darken toward the bottom, so their text is always white. Plain
	// colour tiles flip to dark text for the light fuel techs (solar, OCGT…).
	let darkText = $derived(!photoUrl && needsDarkText(card.dominant));
	let photoSrc = $derived(photoUrl ? `${photoUrl}?w=800&h=420&fit=crop&auto=format&q=75` : null);
</script>

<div
	class="@container relative aspect-[1200/630] w-full overflow-hidden"
	style={photoSrc ? undefined : `background-color: ${dominantColour}`}
>
	{#if photoSrc}
		<img
			src={photoSrc}
			alt={card.name}
			loading="lazy"
			class="absolute inset-0 h-full w-full object-cover"
		/>
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/85"></div>
	{:else}
		<!-- subtle diagonal sheen, matching the OG card's branded variant -->
		<div
			class="absolute inset-0"
			style="background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,0,0,0.24));"
		></div>
	{/if}

	<div class="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-3 @sm:p-4">
		<FuelTechBadgeStack {groups} size="md" showStatus={false} ring="ring-1 ring-white" />
		<div class="min-w-0 max-w-full">
			<h3
				class="mb-0 truncate text-sm leading-none font-semibold @sm:text-base @md:text-lg {darkText
					? 'text-black'
					: 'text-white'}"
			>
				{card.name}
			</h3>
			<p
				class="mt-0.5 truncate font-space text-xxxs font-light @sm:text-xxs {darkText
					? 'text-black/70'
					: 'text-white/85'}"
			>
				{subtitle}
			</p>
		</div>
	</div>
</div>
