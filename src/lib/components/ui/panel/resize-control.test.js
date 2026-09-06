import { afterEach, expect, it, vi } from 'vitest';
import { createResizeControl } from './resize-control.svelte.js';

const lifecycle = vi.hoisted(() => ({ destroy: () => {} }));
vi.mock('svelte', () => ({
	onDestroy: (/** @type {() => void} */ callback) => {
		lifecycle.destroy = callback;
	}
}));
afterEach(() => vi.unstubAllGlobals());

it('removes all window listeners when destroyed in the middle of a drag', () => {
	const target = new EventTarget();
	vi.stubGlobal('window', target);
	const remove = vi.spyOn(target, 'removeEventListener');
	const set = vi.fn();
	const resize = createResizeControl({
		axis: 'y',
		get: () => 260,
		set,
		min: () => 120,
		max: () => 800
	});
	resize.start(
		/** @type {PointerEvent} */ (
			Object.assign(new Event('pointerdown'), {
				button: 0,
				pointerId: 7,
				clientY: 260
			})
		)
	);
	expect(resize.dragging).toBe(true);
	lifecycle.destroy();
	expect(resize.dragging).toBe(false);
	expect(remove.mock.calls.map(([name]) => name)).toEqual([
		'pointermove',
		'pointerup',
		'pointercancel'
	]);
	target.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 7, clientY: 500 }));
	expect(set).not.toHaveBeenCalled();
});
