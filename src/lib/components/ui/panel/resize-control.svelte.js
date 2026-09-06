import { onDestroy } from 'svelte';

/** Shared pointer/keyboard resize lifecycle. Units can be pixels or percentages.
 * @param {{axis: 'x' | 'y', get: () => number, set: (value: number) => void,
 * min: () => number, max: () => number, scale?: () => number, inverted?: boolean,
 * step?: number, commit?: () => void}} opts
 */
export function createResizeControl(opts) {
	let dragging = $state(false);
	let cleanup = () => {};
	const direction = opts.inverted ? -1 : 1;
	const clamp = (/** @type {number} */ value) => Math.min(opts.max(), Math.max(opts.min(), value));
	onDestroy(() => cleanup());
	return {
		get dragging() {
			return dragging;
		},
		/** @param {PointerEvent} event */
		start(event) {
			if (event.button !== 0) return;
			event.preventDefault();
			cleanup();
			dragging = true;
			const origin = opts.axis === 'x' ? event.clientX : event.clientY;
			const initial = opts.get();
			const scale = opts.scale?.() ?? 1;
			/** @param {PointerEvent} move */
			function onMove(move) {
				if (move.pointerId !== event.pointerId) return;
				const position = opts.axis === 'x' ? move.clientX : move.clientY;
				opts.set(clamp(initial + (position - origin) * scale * direction));
			}
			/** @param {PointerEvent} end */
			function finish(end) {
				if (end.pointerId !== event.pointerId) return;
				cleanup();
				opts.commit?.();
			}
			cleanup = () => {
				dragging = false;
				window.removeEventListener('pointermove', onMove);
				window.removeEventListener('pointerup', finish);
				window.removeEventListener('pointercancel', finish);
			};
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', finish);
			window.addEventListener('pointercancel', finish);
		},
		/** @param {KeyboardEvent} event */
		keydown(event) {
			const decrease = opts.axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
			const increase = opts.axis === 'x' ? 'ArrowRight' : 'ArrowDown';
			if (![decrease, increase, 'Home', 'End'].includes(event.key)) return;
			event.preventDefault();
			const step = (opts.step ?? 10) * (event.shiftKey ? 5 : 1);
			const value =
				event.key === 'Home'
					? opts.min()
					: event.key === 'End'
						? opts.max()
						: opts.get() + (event.key === decrease ? -step : step) * direction;
			opts.set(clamp(value));
			opts.commit?.();
		}
	};
}
