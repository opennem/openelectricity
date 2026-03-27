/**
 * Creates a guard that prevents stale async responses from being applied.
 * Each call to `next()` increments an internal counter and returns an `isCurrent()` check.
 * If another `next()` is called before the first resolves, the first's `isCurrent()` returns false.
 *
 * @returns {{ next: () => { isCurrent: () => boolean } }}
 *
 * @example
 * const guard = createRequestGuard();
 *
 * $effect(() => {
 *   const { isCurrent } = guard.next();
 *   fetchData(params).then((data) => {
 *     if (!isCurrent()) return; // stale response, discard
 *     applyData(data);
 *   });
 * });
 */
export function createRequestGuard() {
	let id = 0;

	return {
		next() {
			const thisId = ++id;
			return {
				isCurrent: () => thisId === id
			};
		}
	};
}
