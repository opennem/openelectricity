/**
 * Attachment for hover-read charts drawn outside StratumChart (ridgelines,
 * dials, heatmaps), so they read by touch as well as by mouse.
 *
 * Mouse: moves report, leaving clears, as before.
 * Touch: the chart takes `touch-action: pan-y`, so vertical swipes still
 * scroll the page while a horizontal drag reports as it moves. A tap
 * reports where it lands and the readout stays after the finger lifts (a
 * touch "leaves" on every lift), until a tap elsewhere or a swipe the
 * browser takes over to scroll.
 *
 * @param {{
 *   onmove?: (event: PointerEvent) => void,
 *   onleave: () => void
 * }} handlers
 * @returns {import('svelte/attachments').Attachment<HTMLElement | SVGElement>}
 */
export function pointerInspect({ onmove, onleave }) {
	return (node) => {
		node.style.touchAction = 'pan-y';
		let touchReading = false;

		/** @param {PointerEvent} event */
		const down = (event) => {
			if (event.pointerType !== 'touch') return;
			touchReading = true;
			onmove?.(event);
		};
		/** @param {PointerEvent} event */
		const move = (event) => onmove?.(event);
		/** @param {PointerEvent} event */
		const leave = (event) => {
			if (event.pointerType !== 'touch') onleave();
		};
		const cancel = () => {
			touchReading = false;
			onleave();
		};
		/** @param {PointerEvent} event */
		const elsewhere = (event) => {
			if (!touchReading || node.contains(/** @type {Node} */ (event.target))) return;
			touchReading = false;
			onleave();
		};

		const el = /** @type {HTMLElement} */ (node);
		el.addEventListener('pointerdown', down);
		el.addEventListener('pointermove', move);
		el.addEventListener('pointerleave', leave);
		el.addEventListener('pointercancel', cancel);
		window.addEventListener('pointerdown', elsewhere, true);
		return () => {
			el.removeEventListener('pointerdown', down);
			el.removeEventListener('pointermove', move);
			el.removeEventListener('pointerleave', leave);
			el.removeEventListener('pointercancel', cancel);
			window.removeEventListener('pointerdown', elsewhere, true);
			node.style.removeProperty('touch-action');
		};
	};
}
