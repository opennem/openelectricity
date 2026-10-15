import { version } from '$app/environment';

/**
 * Reload onto the new build when a page still on the previous one asks for
 * a chunk the deploy removed (Vite's `vite:preloadError`), as long-open tabs
 * and the embedded widget do after a release. Once per build, so a chunk
 * that is genuinely missing can't cause a reload loop; without session
 * storage (sandboxed embeds) the error is left to surface.
 */
export function reloadOnStaleBuild() {
	window.addEventListener('vite:preloadError', (event) => {
		const key = `oe:stale-build-reload:${version}`;
		try {
			if (sessionStorage.getItem(key)) return;
			sessionStorage.setItem(key, '1');
		} catch {
			return;
		}
		event.preventDefault();
		window.location.reload();
	});
}
