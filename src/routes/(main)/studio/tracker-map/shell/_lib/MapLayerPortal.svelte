<!--
	MapLayerPortal — teleports a page-authored layer snippet into the layout's
	persistent map. Renders nothing itself.

	Why this works: the snippet is registered here by reference, but the layout
	{@render}s it INSIDE <MapLibre>. Svelte 5 snippets resolve component context
	at their render site, so GeoJSONSource/CircleLayer inside the snippet find
	the MapLibre map context even though the snippet was authored in a page
	component outside the map subtree.
-->
<script>
	import { getMapShellContext } from './map-shell.svelte.js';

	/** @type {{ id: string, layers: import('svelte').Snippet }} */
	let { id, layers } = $props();

	const shell = getMapShellContext();

	// $effect gives symmetric lifecycle: register after mount, and the teardown
	// unregisters when the page is destroyed on navigation — so layers leave
	// the map exactly when their owning route leaves the DOM.
	$effect(() => {
		shell.register(id, layers);
		return () => shell.unregister(id);
	});
</script>
