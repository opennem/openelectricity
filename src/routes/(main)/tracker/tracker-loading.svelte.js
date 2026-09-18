/** Delay only the visual loading notice, never data readiness. Cached regrouping
 * and aggregation can invalidate snapshots for a few reactive turns without
 * needing to dim the charts or table.
 * @param {() => boolean} pending
 * @param {number} [delayMs]
 */
export function createLoadingNotice(pending, delayMs = 200) {
	let visible = $state(false);
	$effect(() => {
		if (!pending()) {
			visible = false;
			return;
		}
		const timer = setTimeout(() => (visible = true), delayMs);
		return () => clearTimeout(timer);
	});
	return {
		get active() {
			return pending() && visible;
		}
	};
}
