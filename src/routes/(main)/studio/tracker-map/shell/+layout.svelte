<!--
	Shell spike proof harness.

	This layout owns ONE persistent GridMap. Sibling child routes (facilities,
	tracker) swap the layers drawn on it and the panel beside it. Two modes:

	- portal (default): pages register layer snippets via MapLayerPortal; the
	  layout {@render}s them inside <GridMap>. Snippets resolve context at
	  their render site, so page-authored layers find the MapLibre context.
	- ?scenes=mounted: both scenes stay mounted inside the map permanently and
	  only their `active` prop (→ paint opacity) toggles per route.

	The diagnostics strip proves the topology: navigating between siblings must
	leave "map mounts" at 1 and "tile loads" flat, while "navs" climbs.
-->
<script>
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import GridMap from '../_shared/GridMap.svelte';
	import FacilitiesScene from './_lib/scenes/FacilitiesScene.svelte';
	import TrackerScene from './_lib/scenes/TrackerScene.svelte';
	import { createMapShell, setMapShellContext } from './_lib/map-shell.svelte.js';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	const shell = createMapShell();
	setMapShellContext(shell);

	let scenesMounted = $derived(page.url.searchParams.get('scenes') === 'mounted');
	let isFacilitiesRoute = $derived(page.url.pathname.endsWith('/facilities'));
	let routeLabel = $derived(page.url.pathname.split('/shell')[1] || '/');

	/** @param {any} ev maplibre 'load' event (types are transitive-only, see GridMap) */
	function handleMapLoad(ev) {
		shell.mapMountCount += 1;
		// `sourcedata` events carry a `.tile` when an individual tile has been
		// loaded/parsed — counting those shows whether basemap tiles were
		// refetched across navigations (they must not be if the map persists).
		// If the map ever remounts, `load` fires again on the NEW map instance
		// and we attach there; the old instance is destroyed with its listener.
		ev.target.on('sourcedata', (/** @type {any} */ sd) => {
			if (sd.tile) shell.tileLoadCount += 1;
		});
	}

	afterNavigate((nav) => {
		// Skip the initial 'enter' so the strip reads "1 map mount / 0 navs" on
		// load, and mounts stay at 1 while navs climb — the whole proof.
		if (nav.type !== 'enter') shell.navCount += 1;
	});

	/** @param {string} path */
	function withMode(path) {
		return scenesMounted ? `${path}?scenes=mounted` : path;
	}
</script>

<!-- h-dvh: the spike runs fullscreen (global chrome hidden via +layout.js),
     so the shell owns the whole viewport rather than sitting under the nav. -->
<div class="flex h-dvh min-h-[560px] flex-col overflow-hidden">
	<!-- Diagnostics strip: dev overlay proving the map survives navigation -->
	<div
		class="flex flex-wrap items-center gap-x-4 gap-y-1 bg-black px-4 py-2 font-mono text-[11px] text-white"
	>
		<span class="text-green-400">shell-spike</span>
		<span>mode: <strong>{scenesMounted ? 'mounted' : 'portal'}</strong></span>
		<span>map mounts: <strong>{shell.mapMountCount}</strong></span>
		<span>navs: <strong>{shell.navCount}</strong></span>
		<span>tile loads: <strong>{shell.tileLoadCount}</strong></span>
		<span>route: <strong>{routeLabel}</strong></span>

		<span class="ml-auto flex items-center gap-3">
			<a
				class="underline {isFacilitiesRoute ? 'text-green-400' : ''}"
				href={withMode('/studio/tracker-map/shell/facilities')}>Facilities</a
			>
			<span aria-hidden="true">⇄</span>
			<a
				class="underline {!isFacilitiesRoute && routeLabel !== '/' ? 'text-green-400' : ''}"
				href={withMode('/studio/tracker-map/shell/tracker')}>Tracker</a
			>
			<a
				class="text-white/60 underline"
				href={scenesMounted ? page.url.pathname : `${page.url.pathname}?scenes=mounted`}
			>
				switch to {scenesMounted ? 'portal' : 'mounted'}
			</a>
		</span>
	</div>

	<div class="flex min-h-0 flex-1">
		<!-- The ONE persistent map. It lives in the layout, so SvelteKit keeps
		     it mounted while sibling child routes swap beneath it. -->
		<div class="relative min-w-0 flex-1">
			<GridMap bind:this={shell.mapRef} mapTheme="light" onload={handleMapLoad}>
				{#if scenesMounted}
					<!-- Mounted mode: both scenes always in the map; routes only
					     flip `active` (paint opacity cross-fade). -->
					<FacilitiesScene active={isFacilitiesRoute} />
					<TrackerScene active={!isFacilitiesRoute} />
				{:else}
					<!-- Portal mode: render whatever snippets the current page
					     registered. Keyed by portal id so scenes swap cleanly. -->
					{#each [...shell.layers] as [id, layers] (id)}
						{@render layers()}
					{/each}
				{/if}
			</GridMap>
		</div>

		<!-- Panel column: the route-specific UI beside the shared map -->
		<aside class="w-[380px] shrink-0 overflow-y-auto border-l border-warm-grey bg-white">
			{@render children()}
		</aside>
	</div>
</div>
