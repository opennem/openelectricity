<script module>
	import GlobeAlt from '$lib/icons/GlobeAlt.svelte';

	/** @type {Map<string, any>} */
	const iconCache = new Map();

	/**
	 * PascalCase a fueltech_id, mirroring FuelTechBadge's icon-name mapping
	 * (coal_black → CoalBlack → CoalBlackSm.svelte).
	 * @param {string} ft
	 */
	function fuelTechIconName(ft) {
		return ft
			.split('_')
			.map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
			.join('');
	}

	/**
	 * Resolve a fueltech's `*Sm` icon component, cached. Falls back to GlobeAlt.
	 * @param {string} ft
	 */
	async function getIcon(ft) {
		if (iconCache.has(ft)) return iconCache.get(ft);
		let component = GlobeAlt;
		try {
			const module = await import(`$lib/icons/fuel-techs/${fuelTechIconName(ft)}Sm.svelte`);
			component = module.default;
		} catch {
			/* missing icon → GlobeAlt */
		}
		iconCache.set(ft, component);
		return component;
	}
</script>

<script>
	/**
	 * Live, in-app recreation of the build-time facility OG card's branded
	 * (no-photo) variant — the fallback for facilities that don't yet have a
	 * committed `static/og/facility/<code>.jpg`. Mirrors `$lib/server/og/facility-card.js`
	 * but reuses the canonical `FuelTechBadge` / `fueltech-display` instead of
	 * re-deriving colours, so it stays visually in step with the facility pages.
	 *
	 * The card is laid out at the true 1200×630 OG size and uniformly scaled to its
	 * container width, so badges, type and spacing keep the exact OG proportions at
	 * any tile size.
	 */
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { deriveCard, formatCardSubtitle } from '$lib/og/facility-card-data.js';
	import { OG_CARD_WIDTH, OG_CARD_HEIGHT } from '$lib/og/card-dimensions.js';

	/** @type {{ facility: any }} */
	let { facility } = $props();

	let card = $derived(deriveCard(facility));
	let dominantColour = $derived(getFueltechColor(card.dominant));
	let dark = $derived(needsDarkText(card.dominant));
	let textColour = $derived(dark ? '#0b0b0b' : '#ffffff');
	let subColour = $derived(dark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.88)');

	let subtitle = $derived(formatCardSubtitle(card));

	// Measure the rendered width and scale the fixed 1200×630 canvas to fit.
	let width = $state(0);
	let scale = $derived(width ? width / OG_CARD_WIDTH : 0);
</script>

<div
	class="relative w-full overflow-hidden"
	style="aspect-ratio: {OG_CARD_WIDTH} / {OG_CARD_HEIGHT}; background-color: {dominantColour};"
	bind:clientWidth={width}
>
	<!-- subtle diagonal sheen, matching the satori card -->
	<div
		class="absolute inset-0"
		style="background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,0,0,0.24));"
	></div>

	{#if scale > 0}
		<div
			class="absolute top-0 left-0 origin-top-left"
			style="width: {OG_CARD_WIDTH}px; height: {OG_CARD_HEIGHT}px; transform: scale({scale});"
		>
			<!-- faint dominant-tech watermark -->
			<div
				class="absolute"
				style="right: -40px; bottom: -90px; width: 520px; height: 520px; opacity: 0.1; color: {textColour};"
			>
				{#await getIcon(card.dominant) then Icon}
					<Icon class="w-full h-full" />
				{/await}
			</div>

			<!-- OE wordmark -->
			<img
				src="/img/logo.svg"
				alt="OpenElectricity"
				style="position: absolute; top: 52px; left: 64px; width: 219px; height: 26px; filter: {dark
					? 'brightness(0)'
					: 'brightness(0) invert(1)'};"
			/>

			<!-- title block: badges · name · subtitle -->
			<div class="absolute flex flex-col" style="left: 64px; right: 64px; bottom: 60px;">
				{#if card.fuelTechs.length}
					<div class="flex items-center">
						{#each card.fuelTechs as ft, i (ft)}
							<span
								class="block rounded-full"
								style="margin-left: {i
									? -18
									: 0}px; box-shadow: 0 0 0 4px {textColour}, 0 3px 10px rgba(0,0,0,0.28); z-index: {card
									.fuelTechs.length - i};"
							>
								<FuelTechBadge fuelTech={ft} size="lg" />
							</span>
						{/each}
					</div>
				{/if}

				<div
					class="font-bold"
					style="margin-top: 26px; font-size: 62px; line-height: 1.04; letter-spacing: -1px; max-width: 1040px; color: {textColour};"
				>
					{card.name}
				</div>

				<div
					class="font-space font-medium"
					style="margin-top: 18px; font-size: 28px; color: {subColour};"
				>
					{subtitle}
				</div>
			</div>
		</div>
	{/if}
</div>
