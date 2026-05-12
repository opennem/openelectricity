/**
 * Reusable drag-resize handler factory.
 *
 * Creates a reactive drag handler for resizing panels by pointer drag.
 * Supports both horizontal (x-axis) and vertical (y-axis) resizing,
 * with persistence to localStorage (default) or a caller-supplied store.
 *
 * Two sizing modes:
 *  - Pixel mode (default): value is a pixel quantity, `min`/`max`/`initial` are px.
 *  - Fraction mode: pass `scale: () => number` (container size in px). Value is a
 *    fraction in [0, 1]; `min`/`max`/`initial` are fractions. Pixel deltas are
 *    divided by `scale()` so the split tracks the cursor regardless of container width.
 *
 * Persistence:
 *  - Default: localStorage, keyed by `storageKey`.
 *  - Override: pass `persist: { read, write }` to use any backing store (e.g. cookies,
 *    so a server-rendered value can match the first client paint). When `persist` is
 *    supplied, `storageKey` is ignored.
 *
 * @param {{ axis: 'x' | 'y', min: number, max: number, initial: number, storageKey?: string, invert?: boolean, scale?: () => number, persist?: { read?: () => number | null | undefined, write?: (v: number) => void } }} options
 * @returns {{ start: (e: PointerEvent) => void, value: number, isDragging: boolean }}
 */
export function createDragHandler({
	axis,
	min,
	max,
	initial,
	storageKey,
	invert = false,
	scale,
	persist
}) {
	const persistedRead = persist?.read
		? () => {
				const v = persist.read?.();
				return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
			}
		: () => loadValue(storageKey ?? '', min, max, null);

	const persistedWrite = persist?.write
		? persist.write
		: (/** @type {number} */ v) => {
				if (storageKey && typeof localStorage !== 'undefined') {
					localStorage.setItem(storageKey, String(v));
				}
			};

	let value = $state(persistedRead() ?? initial);
	let isDragging = $state(false);

	/** @param {PointerEvent} e */
	function start(e) {
		e.preventDefault();
		isDragging = true;
		const startPos = axis === 'x' ? e.clientX : e.clientY;
		const startValue = value;

		/** @param {PointerEvent} moveEvent */
		function onMove(moveEvent) {
			const currentPos = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
			const rawDelta = currentPos - startPos;
			const signedDelta = invert ? -rawDelta : rawDelta;
			const delta = scale ? signedDelta / Math.max(1, scale()) : signedDelta;
			value = Math.min(max, Math.max(min, startValue + delta));
		}

		function onUp() {
			isDragging = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			persistedWrite(value);
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	return {
		start,
		get value() {
			return value;
		},
		set value(v) {
			value = v;
		},
		get isDragging() {
			return isDragging;
		}
	};
}

/**
 * Read a persisted value from localStorage, clamped to [min, max].
 * @template {number | null} T
 * @param {string} key
 * @param {number} min
 * @param {number} max
 * @param {T} fallback
 * @returns {number | T}
 */
function loadValue(key, min, max, fallback) {
	if (key && typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem(key);
		if (saved) {
			const v = parseFloat(saved);
			if (Number.isFinite(v) && v >= min && v <= max) return v;
		}
	}
	return fallback;
}
