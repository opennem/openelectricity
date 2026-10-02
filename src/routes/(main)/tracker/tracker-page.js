import { onNavigate, pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { on } from 'svelte/events';
import { onMount, untrack } from 'svelte';
import { BELOW_TABLET_QUERY } from '$lib/utils/fullscreen-mode.js';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerNavigation } from './tracker-navigation.js';
import { copiedTrackerUrl } from './tracker-url.js';
import { startTrackerClock } from './tracker-live.js';

/**
 * One view page's session, wired to browser history. Each view is its own
 * route, so a page owns a session for exactly that view: switching views
 * mounts the next page with a fresh session, and only this route's own URLs
 * (shallow history and same-route links) restore into it.
 * Call during component initialisation.
 * @param {() => import('./types.js').TrackerUrlState & {nowMs: number}} getData - route data, read once
 */
export function createTrackerPage(getData) {
	const navigation = createTrackerNavigation(
		{
			read: () => new URL(typeof window === 'undefined' ? page.url : window.location.href),
			write: (url, mode) => {
				const history = mode === 'push' ? pushState : replaceState;
				history(url.pathname + url.search, {});
			}
		},
		// The data was loaded for page.url, which can lag the address bar (below).
		new URL(page.url)
	);
	const session = createTrackerSession(untrack(getData), (mode) =>
		navigation.write(session.selection, mode)
	);

	/** @param {URL} url */
	function restore(url) {
		const restored = navigation.read(url, Date.now());
		if (restored) session.restore(restored);
	}

	// Same-route links arrive as navigations; shallow history (our pushState
	// entries) only as popstate, since SvelteKit leaves page.url alone.
	onNavigate(({ to }) => {
		if (to) restore(to.url);
	});
	onMount(() => {
		// Back/Forward onto another route's shallow entry renders that entry's
		// base page URL; the address bar still holds the shallow query.
		restore(new URL(window.location.href));
		// Below the tablet breakpoint the side-by-side panel would crush the
		// charts — default it closed unless the URL explicitly asked for it.
		// SSR stays stable (open); this only adjusts after hydration.
		const params = new URL(window.location.href).searchParams;
		if (!params.has('table') && window.matchMedia(BELOW_TABLET_QUERY).matches) {
			session.select('tablePanelOpen', false, null);
		}
		const offPopstate = on(window, 'popstate', () => restore(new URL(window.location.href)));
		// A minute clock keeps the freshness labels honest; it never fetches.
		const stopClock = startTrackerClock({ document, tick: () => session.setClock(Date.now()) });
		return () => {
			offPopstate();
			stopClock();
		};
	});

	return {
		session,
		/** The current selection as a shareable address — copied links and export provenance. */
		shareUrl: () => copiedTrackerUrl(new URL(window.location.href), session.selection)
	};
}
