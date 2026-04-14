<script>
	/**
	 * FacilityPanelFooter — pinned note bar at the bottom of the facility
	 * detail panel. Shows the capacity-definition caveat with a link to the
	 * OpenElectricity docs.
	 */
	import { Info, ExternalLink } from '@lucide/svelte';
</script>

<div
	class="shrink-0 border-t border-warm-grey px-6 py-3 flex items-center gap-2 text-xxs text-mid-grey bg-white"
>
	<Info size={12} class="shrink-0" />
	<span class="min-w-0">
		Capacity shown is maximum capacity where available, otherwise registered capacity.
	</span>
	<a
		href="https://docs.openelectricity.org.au/guides/capacity"
		target="_blank"
		rel="noopener noreferrer"
		class="ml-auto shrink-0 inline-flex items-center gap-1 text-dark-grey hover:underline no-underline"
	>
		Learn more
		<ExternalLink size={10} />
	</a>
</div>
