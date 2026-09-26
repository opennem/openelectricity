const STORAGE_KEY = 'tracker-metrics-visible';

/**
 * Whether the window-metrics strip is shown. A personal display preference,
 * so it lives in localStorage rather than the URL — shared links never hide
 * the recipient's metrics. Restored after mount so the server-rendered and
 * hydrating pages agree. Call during component init (or inside an effect root).
 */
export function createMetricsVisibilityPreference() {
	let visible = $state(true);

	// Runs once after mount: it reads storage, never tracked state.
	$effect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw !== null) visible = raw !== 'false';
		} catch {
			// Blocked storage or an unparseable value — keep the default.
		}
	});

	return {
		get value() {
			return visible;
		},
		/** @param {boolean} next */
		set value(next) {
			visible = next;
			try {
				localStorage.setItem(STORAGE_KEY, String(next));
			} catch {
				// Storage blocked or full — the in-memory preference still works.
			}
		},
		toggle() {
			this.value = !visible;
		}
	};
}
