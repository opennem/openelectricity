/** How long (ms) a touch must stay down to count as a long press. */
export const LONG_PRESS_MS = 500;
/** Movement (px) that cancels a press: the finger is scrolling instead. */
const MOVE_TOLERANCE = 8;

/**
 * Attachment: a long touch press calls `onlongpress`, the touch counterpart
 * of a modifier-click (e.g. ⌘/Ctrl-click to solo a table row). The click
 * the browser sends when that finger lifts is swallowed, so the press
 * doesn't also act as a tap. Mouse and pen are left alone. The iOS
 * callout (copy / look up) is turned off on the element.
 *
 * @param {() => void} onlongpress
 * @returns {import('svelte/attachments').Attachment<HTMLElement>}
 */
export function longPress(onlongpress) {
	return (node) => {
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let timer;
		let startX = 0;
		let startY = 0;
		let fired = false;

		const cancel = () => {
			clearTimeout(timer);
			timer = undefined;
		};
		/** @param {PointerEvent} event */
		const down = (event) => {
			if (event.pointerType !== 'touch' || !event.isPrimary) return;
			fired = false;
			startX = event.clientX;
			startY = event.clientY;
			cancel();
			timer = setTimeout(() => {
				timer = undefined;
				fired = true;
				onlongpress();
			}, LONG_PRESS_MS);
		};
		/** @param {PointerEvent} event */
		const move = (event) => {
			if (timer === undefined) return;
			const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
			if (moved > MOVE_TOLERANCE) cancel();
		};
		/** @param {MouseEvent} event */
		const click = (event) => {
			if (!fired) return;
			fired = false;
			event.preventDefault();
			event.stopImmediatePropagation();
		};

		const style = /** @type {CSSStyleDeclaration & { webkitTouchCallout?: string }} */ (node.style);
		style.webkitTouchCallout = 'none';
		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', cancel);
		node.addEventListener('pointercancel', cancel);
		node.addEventListener('click', click, true);
		return () => {
			cancel();
			style.webkitTouchCallout = '';
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', cancel);
			node.removeEventListener('pointercancel', cancel);
			node.removeEventListener('click', click, true);
		};
	};
}
