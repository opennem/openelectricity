// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { longPress, LONG_PRESS_MS } from './long-press.js';

/**
 * @param {EventTarget} target
 * @param {string} type
 * @param {{ pointerType?: string, clientX?: number, clientY?: number }} [init]
 */
function pointer(target, type, { pointerType = 'touch', clientX = 0, clientY = 0 } = {}) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(event, { pointerType, isPrimary: true, clientX, clientY });
	target.dispatchEvent(event);
}

function setup() {
	const node = document.createElement('button');
	document.body.append(node);
	const onlongpress = vi.fn();
	const onclick = vi.fn();
	node.addEventListener('click', onclick);
	longPress(onlongpress)(node);
	return { node, onlongpress, onclick };
}

describe('longPress', () => {
	afterEach(() => vi.useRealTimers());

	it('fires after a still touch and swallows the click that follows', () => {
		vi.useFakeTimers();
		const { node, onlongpress, onclick } = setup();
		pointer(node, 'pointerdown');
		vi.advanceTimersByTime(LONG_PRESS_MS);
		expect(onlongpress).toHaveBeenCalledOnce();
		pointer(node, 'pointerup');
		node.click();
		expect(onclick).not.toHaveBeenCalled();
		// The next ordinary tap clicks as usual.
		node.click();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('leaves a short tap as a click', () => {
		vi.useFakeTimers();
		const { node, onlongpress, onclick } = setup();
		pointer(node, 'pointerdown');
		vi.advanceTimersByTime(LONG_PRESS_MS - 100);
		pointer(node, 'pointerup');
		vi.advanceTimersByTime(200);
		node.click();
		expect(onlongpress).not.toHaveBeenCalled();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('cancels when the finger moves (a scroll) and ignores the mouse', () => {
		vi.useFakeTimers();
		const { node, onlongpress } = setup();
		pointer(node, 'pointerdown');
		pointer(node, 'pointermove', { clientY: 20 });
		vi.advanceTimersByTime(LONG_PRESS_MS);
		pointer(node, 'pointerdown', { pointerType: 'mouse' });
		vi.advanceTimersByTime(LONG_PRESS_MS);
		expect(onlongpress).not.toHaveBeenCalled();
	});
});
