<script>
	import { page } from '$app/state';
	import MapLayerPortal from '../_lib/MapLayerPortal.svelte';
	import FacilitiesScene, { MOCK_FACILITIES } from '../_lib/scenes/FacilitiesScene.svelte';

	let scenesMounted = $derived(page.url.searchParams.get('scenes') === 'mounted');
</script>

{#if !scenesMounted}
	<!-- Portal mode: this page contributes its layers to the layout's map.
	     In mounted mode the layout already hosts the scene, so skip. -->
	<MapLayerPortal id="facilities">
		{#snippet layers()}
			<FacilitiesScene active={true} />
		{/snippet}
	</MapLayerPortal>
{/if}

<div class="flex flex-col gap-6 p-6">
	<div>
		<h1 class="text-lg font-semibold">Facilities</h1>
		<p class="mt-1 text-xs text-mid-grey">Mock facility list (shell spike)</p>
	</div>

	<ul class="flex flex-col divide-y divide-warm-grey text-sm">
		{#each MOCK_FACILITIES as facility (facility.id)}
			<li class="flex items-center gap-3 py-2">
				<span
					class="inline-block h-3 w-3 shrink-0 rounded-full"
					style="background-color: {facility.colour};"
				></span>
				{facility.name}
			</li>
		{/each}
	</ul>

	<div class="rounded-lg border border-warm-grey bg-light-warm-grey p-4 text-xs leading-relaxed">
		<p class="font-semibold">Verify while navigating Facilities ⇄ Tracker:</p>
		<ul class="mt-2 list-disc pl-4">
			<li>"map mounts" in the strip stays at 1 (map did not remount)</li>
			<li>"tile loads" stays flat (basemap tiles were not refetched)</li>
			<li>browser back/forward swaps layers and panels correctly</li>
			<li>pan/zoom position survives navigation between siblings</li>
		</ul>
	</div>
</div>
