<script>
	/**
	 * A facility's social card: the build-generated OG JPG
	 * (`/og/facility/<code>.jpg`) when one is committed, else a live-rendered
	 * <FacilityOgCard>. Shared by the Cards grid and the map popup so the
	 * static/live decision and image attributes live in one place. The caller
	 * controls sizing (this just fills its container at the 1200×630 aspect).
	 *
	 * @type {{ facility: any, cardCodes: Set<string> }}
	 */
	import FacilityOgCard from '$lib/components/FacilityOgCard.svelte';

	let { facility, cardCodes } = $props();
</script>

{#if cardCodes.has(facility.code)}
	<img
		src="/og/facility/{facility.code}.jpg"
		alt="Social card for {facility.name}"
		loading="lazy"
		width="1200"
		height="630"
		class="block aspect-[1200/630] w-full object-cover"
	/>
{:else}
	<FacilityOgCard {facility} />
{/if}
