/**
 * localStorage-backed reactive state — a `$state` value that initialises from
 * localStorage and writes back on every set. SSR-safe: the fallback is used
 * on the server or when storage is unavailable, and writes fail silently
 * (private browsing, full quota) leaving the in-memory state working.
 *
 * Values round-trip through JSON, and `validate` guards against stale or
 * foreign stored values (a rejected value falls back).
 *
 * @template T
 * @param {string} key - localStorage key
 * @param {T} fallback - value when nothing (valid) is stored
 * @param {(value: any) => boolean} [validate] - accept only valid stored values
 * @returns {{ value: T }}
 */
export function createLocalStorageState(key, fallback, validate) {
	let initial = fallback;
	if (typeof localStorage !== 'undefined') {
		try {
			const raw = localStorage.getItem(key);
			if (raw !== null) {
				const parsed = JSON.parse(raw);
				if (!validate || validate(parsed)) initial = /** @type {T} */ (parsed);
			}
		} catch {
			// Unparseable value or blocked storage — use the fallback.
		}
	}

	let value = $state(initial);

	return {
		get value() {
			return value;
		},
		set value(v) {
			value = v;
			if (typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(key, JSON.stringify(v));
				} catch {
					// Storage blocked or full — the in-memory state still works.
				}
			}
		}
	};
}
