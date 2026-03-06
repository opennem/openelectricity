/**
 * Reusable drag-resize handler factory.
 *
 * Creates a reactive drag handler for resizing panels by pointer drag.
 * Supports both horizontal (x-axis) and vertical (y-axis) resizing,
 * with localStorage persistence.
 *
 * @param {{ axis: 'x' | 'y', min: number, max: number, initial: number, storageKey: string, invert?: boolean }} options
 *   - axis: 'x' for horizontal, 'y' for vertical
 *   - min/max: clamping bounds
 *   - initial: default value (used if nothing in localStorage)
 *   - storageKey: localStorage key for persistence
 *   - invert: if true, delta is negated (e.g. dragging left to increase width for right-anchored panels, or dragging up to increase height)
 * @returns {{ start: (e: PointerEvent) => void, value: number, isDragging: boolean }}
 */
export function createDragHandler({ axis, min, max, initial, storageKey, invert = false }) {
	// Load persisted value
	let value = $state(loadValue(storageKey, min, max, initial));
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
			const delta = invert ? -rawDelta : rawDelta;
			value = Math.min(max, Math.max(min, startValue + delta));
		}

		function onUp() {
			isDragging = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(storageKey, String(value));
			}
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
 * @param {string} key
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function loadValue(key, min, max, fallback) {
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem(key);
		if (saved) {
			const v = parseInt(saved, 10);
			if (v >= min && v <= max) return v;
		}
	}
	return fallback;
}
