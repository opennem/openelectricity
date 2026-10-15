/**
 * @typedef {{ trigger?: HTMLElement, align?: string, position?: string, gap?: number }} DropdownPositionOpts
 */

/** Margin (px) a panel keeps from the viewport's edges. */
const EDGE = 8;

/**
 * Svelte action that positions a fixed-position dropdown relative to a trigger element.
 * Auto-aligns to the right if the dropdown would overflow the right edge of the viewport,
 * never past either edge (an `EDGE` margin), and caps its height at the space left
 * between the trigger and the viewport edge, so a scrolling body stays reachable.
 * @param {HTMLElement} node - The dropdown element (should have position: fixed)
 * @param {DropdownPositionOpts} opts
 */
export function dropdownPosition(node, opts) {
	function update() {
		if (!opts.trigger) return;

		const rect = opts.trigger.getBoundingClientRect();
		const gap = opts.gap ?? 8;

		if (opts.position === 'top') {
			node.style.bottom = `${window.innerHeight - rect.top + gap}px`;
			node.style.top = '';
			node.style.maxHeight = `${Math.max(0, rect.top - gap - EDGE)}px`;
		} else {
			node.style.top = `${rect.bottom + gap}px`;
			node.style.bottom = '';
			node.style.maxHeight = `${Math.max(0, window.innerHeight - rect.bottom - gap - EDGE)}px`;
		}

		// Determine horizontal alignment
		let align = opts.align;
		if (!align || align === 'left') {
			// Auto-detect: if left-aligning would overflow the right edge, switch to right
			const dropdownWidth = node.offsetWidth;
			if (rect.left + dropdownWidth > window.innerWidth) {
				align = 'right';
			}
		}

		// The capped height scrolls rather than clipping the panel's content.
		node.style.overflowY = 'auto';

		// Never past either edge: a right-aligned panel wider than the space
		// to the trigger's left would otherwise run off the left side.
		const width = node.offsetWidth;
		if (align === 'right') {
			const right = window.innerWidth - rect.right;
			node.style.right = `${Math.max(EDGE, Math.min(right, window.innerWidth - width - EDGE))}px`;
			node.style.left = '';
		} else {
			node.style.left = `${Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE))}px`;
			node.style.right = '';
		}
	}

	update();

	window.addEventListener('scroll', update, true);
	window.addEventListener('resize', update);

	return {
		/** @param {DropdownPositionOpts} newOpts */
		update(newOpts) {
			opts = newOpts;
			update();
		},
		destroy() {
			window.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
		}
	};
}
