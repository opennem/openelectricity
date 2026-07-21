import { createRequestGuard } from './request-guard';

/**
 * Resolve a streamed load() promise into reactive state.
 *
 * SvelteKit streams promises returned un-awaited from a server load; consuming
 * them via `{#await}` flashes the pending branch on every re-navigation. This
 * helper resolves into state instead, so the previous value stays rendered
 * until the new one lands, and stale resolutions from superseded navigations
 * are discarded via `createRequestGuard`.
 *
 * Uses `$state.raw` — resolved payloads are treated as immutable, so deep
 * proxies would be pure overhead. Must be called during component init (it
 * registers an `$effect`).
 *
 * @template T
 * @param {() => Promise<T> | T} getPromise — read the streamed page-data value
 *   inside this getter so the effect re-runs when navigation replaces it
 * @returns {{ readonly current: T | null }}
 */
export function streamedState(getPromise) {
	/** @type {T | null} */
	let value = $state.raw(null);
	const guard = createRequestGuard();

	$effect(() => {
		const { isCurrent } = guard.next();
		Promise.resolve(getPromise()).then((resolved) => {
			if (isCurrent()) value = resolved;
		});
	});

	return {
		get current() {
			return value;
		}
	};
}
