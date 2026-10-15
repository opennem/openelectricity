// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { pointerInspect } from './pointer-inspect.js';

/**
 * @param {EventTarget} target
 * @param {string} type
 * @param {'mouse' | 'touch'} pointerType
 */
function pointer(target, type, pointerType) {
	const event = new Event(type, { bubbles: true });
	Object.assign(event, { pointerType, clientX: 10, clientY: 10 });
	target.dispatchEvent(event);
}

function setup() {
	const node = document.createElement('div');
	const outside = document.createElement('button');
	document.body.append(node, outside);
	const onmove = vi.fn();
	const onleave = vi.fn();
	const detach = pointerInspect({ onmove, onleave })(node);
	return { node, outside, onmove, onleave, detach };
}

describe('pointerInspect', () => {
	it('lets vertical swipes scroll the page', () => {
		const { node, detach } = setup();
		expect(node.style.touchAction).toBe('pan-y');
		detach?.();
		expect(node.style.touchAction).toBe('');
	});

	it('reads on mouse moves and clears when the mouse leaves', () => {
		const { node, onmove, onleave } = setup();
		pointer(node, 'pointermove', 'mouse');
		expect(onmove).toHaveBeenCalledOnce();
		pointer(node, 'pointerleave', 'mouse');
		expect(onleave).toHaveBeenCalledOnce();
	});

	it('keeps a tapped reading after the finger lifts, until a tap elsewhere', () => {
		const { node, outside, onmove, onleave } = setup();
		pointer(node, 'pointerdown', 'touch');
		expect(onmove).toHaveBeenCalledOnce();
		pointer(node, 'pointerleave', 'touch');
		expect(onleave).not.toHaveBeenCalled();
		pointer(outside, 'pointerdown', 'touch');
		expect(onleave).toHaveBeenCalledOnce();
	});

	it('clears when the browser takes the touch to scroll', () => {
		const { node, onleave } = setup();
		pointer(node, 'pointerdown', 'touch');
		pointer(node, 'pointercancel', 'touch');
		expect(onleave).toHaveBeenCalledOnce();
	});
});
