/**
 * Suppression guard to prevent feedback loops when two charts
 * mutually sync their viewport via `onviewportchange`.
 *
 * Usage: wrap the imperative sync call in `runSuppressed(fn)`. Callbacks
 * from the other chart check `isSuppressed()` at their entry point and bail.
 */
export function createViewportSync() {
	let suppressed = false;
	return {
		isSuppressed: () => suppressed,
		/** @param {() => void} fn */
		runSuppressed(fn) {
			suppressed = true;
			try {
				fn();
			} finally {
				queueMicrotask(() => {
					suppressed = false;
				});
			}
		}
	};
}
