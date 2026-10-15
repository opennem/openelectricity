// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { dropdownPosition } from './dropdown-position.js';

/**
 * A trigger at `left`/`right`, `top`/`bottom`, and a panel `width` wide, in a
 * 390 × 800 viewport.
 * @param {{ left: number, right: number, top?: number, bottom?: number, width: number }} box
 */
function place({ left, right, top = 40, bottom = 70, width }) {
	Object.assign(window, { innerWidth: 390, innerHeight: 800 });
	const trigger = document.createElement('button');
	trigger.getBoundingClientRect = () =>
		/** @type {DOMRect} */ ({
			left,
			right,
			top,
			bottom,
			width: right - left,
			height: bottom - top
		});
	const node = document.createElement('div');
	Object.defineProperty(node, 'offsetWidth', { value: width });
	return { node, action: dropdownPosition(node, { trigger }) };
}

describe('dropdownPosition', () => {
	/** @type {ReturnType<typeof place>['action'] | undefined} */
	let action;
	afterEach(() => action?.destroy());

	it('opens below the trigger with a height that fits the viewport, scrolling beyond it', () => {
		const placed = place({ left: 20, right: 120, width: 200 });
		action = placed.action;
		expect(placed.node.style.top).toBe('78px');
		expect(placed.node.style.maxHeight).toBe(`${800 - 70 - 8 - 8}px`);
		expect(placed.node.style.overflowY).toBe('auto');
		expect(placed.node.style.left).toBe('20px');
	});

	it('flips to the right edge, but never past the left edge', () => {
		const placed = place({ left: 250, right: 330, width: 340 });
		action = placed.action;
		expect(placed.node.style.left).toBe('');
		// Right-aligned to the trigger would start at 390 - 60 - 340 = -10px.
		expect(placed.node.style.right).toBe(`${390 - 340 - 8}px`);
	});
});
