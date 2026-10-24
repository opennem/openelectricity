import { version } from '$app/environment';

/**
 * Reload onto the new build when a page still on the previous one asks for
 * a chunk the deploy removed (Vite's `vite:preloadError`), as long-open tabs
 * and the embedded widget do after a release. Once per build, so a chunk
 * that is genuinely missing can't cause a reload loop; without session
 * storage (sandboxed embeds) the error is left to surface.
 *
 * The event isn't cancelled: Vite would then resolve the import to
 * `undefined`, which crashes the router before the reload lands. The import
 * fails with its own error instead, which `IGNORED_ERRORS` drops.
 */
export function reloadOnStaleBuild() {
	window.addEventListener('vite:preloadError', () => {
		const key = `oe:stale-build-reload:${version}`;
		try {
			if (sessionStorage.getItem(key)) return;
			sessionStorage.setItem(key, '1');
		} catch {
			return;
		}
		window.location.reload();
	});
}
