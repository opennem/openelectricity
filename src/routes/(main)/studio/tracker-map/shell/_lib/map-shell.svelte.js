/**
 * Shared shell context for the unified map app spike.
 *
 * The layout creates ONE shell object and puts it in context. Child pages
 * register map-layer snippets into `layers`; the layout renders those snippets
 * INSIDE the persistent <MapLibre> instance. Because Svelte 5 snippets resolve
 * component context at their *render* site (not where they were authored),
 * GeoJSONSource/CircleLayer components inside a page-authored snippet still
 * find the MapLibre map context — that is the whole trick that lets sibling
 * routes swap layers on a map they don't own.
 */

import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

const MAP_SHELL_KEY = Symbol('tracker-map-shell');

/** @typedef {ReturnType<typeof createMapShell>} MapShell */

export function createMapShell() {
	/**
	 * Reactive registry of { id → snippet }. SvelteMap gives us fine-grained
	 * reactivity on set/delete so the layout's {#each [...layers]} re-runs when
	 * pages register/unregister — without proxying the snippet functions.
	 * @type {SvelteMap<string, import('svelte').Snippet>}
	 */
	const layers = new SvelteMap();

	/**
	 * Bindable slot for the GridMap component instance (bind:this in the
	 * layout). $state.raw — it's a component handle, never deep-proxied.
	 * @type {import('../../_shared/GridMap.svelte').default | null}
	 */
	let mapRef = $state.raw(null);

	// Diagnostics. Plain $state numbers the layout increments; if the shell
	// topology is right, mapMountCount and tileLoadCount stay flat while
	// navCount climbs as you hop between sibling routes.
	let mapMountCount = $state(0);
	let navCount = $state(0);
	let tileLoadCount = $state(0);

	return {
		layers,

		/**
		 * @param {string} id
		 * @param {import('svelte').Snippet} snippet
		 */
		register(id, snippet) {
			layers.set(id, snippet);
		},

		/** @param {string} id */
		unregister(id) {
			layers.delete(id);
		},

		get mapRef() {
			return mapRef;
		},
		set mapRef(value) {
			mapRef = value;
		},

		get mapMountCount() {
			return mapMountCount;
		},
		set mapMountCount(value) {
			mapMountCount = value;
		},

		get navCount() {
			return navCount;
		},
		set navCount(value) {
			navCount = value;
		},

		get tileLoadCount() {
			return tileLoadCount;
		},
		set tileLoadCount(value) {
			tileLoadCount = value;
		}
	};
}

/**
 * @param {MapShell} shell
 * @returns {MapShell}
 */
export function setMapShellContext(shell) {
	return setContext(MAP_SHELL_KEY, shell);
}

/** @returns {MapShell} */
export function getMapShellContext() {
	return getContext(MAP_SHELL_KEY);
}
