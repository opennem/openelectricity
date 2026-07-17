/**
 * Suppression guard for viewport pushes that would echo back through
 * `onviewportchange`.
 *
 * Pushing a viewport into a chart makes the chart report that same viewport
 * back; without a guard the owner would re-handle its own push (or feed it
 * back to the other charts, looping forever). `run(fn)` raises the guard for
 * the push and releases it on a microtask — after the synchronous echo has
 * been ignored, but before any genuine user gesture can arrive.
 */
export function createEchoGuard() {
	let suppressed = false;

	return {
		get suppressed() {
			return suppressed;
		},

		/** @param {() => void} fn */
		run(fn) {
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
