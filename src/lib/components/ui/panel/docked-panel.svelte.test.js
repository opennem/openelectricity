import { beforeEach, expect, it, vi } from 'vitest';
import { createDockedPanel } from './docked-panel.svelte.js';

const lifecycle = vi.hoisted(() => ({ mount: () => {} }));
vi.mock('svelte', () => ({
	onMount: (/** @type {() => void} */ callback) => {
		lifecycle.mount = callback;
	},
	onDestroy: () => {},
	tick: async () => {}
}));

beforeEach(() => {
	localStorage.clear();
	lifecycle.mount = () => {};
});

/** @param {string} type @param {number} clientY */
function pointer(type, clientY) {
	return /** @type {PointerEvent} */ (
		Object.assign(new Event(type, { cancelable: true }), { button: 0, pointerId: 1, clientY })
	);
}

/**
 * Drag the handle by `delta` pixels, or click it in place when 0.
 * @param {{ start: (event: PointerEvent) => void }} panel
 * @param {number} delta
 */
function drag(panel, delta) {
	panel.start(pointer('pointerdown', 0));
	if (delta) window.dispatchEvent(pointer('pointermove', delta));
	window.dispatchEvent(pointer('pointerup', delta));
}

/** @param {number | (() => number)} initial */
function create(initial, storageKey = 'test-panel') {
	const panel = createDockedPanel({
		axis: 'y',
		initial,
		min: () => 120,
		max: () => 1200,
		storageKey
	});
	lifecycle.mount();
	return panel;
}

it('follows a live default until resized, then keeps and saves the size', () => {
	let fill = $state(500);
	const panel = create(() => fill);
	expect(panel.size).toBe(500);

	fill = 640;
	expect(panel.size).toBe(640);

	drag(panel, 60);
	expect(panel.size).toBe(700);
	expect(localStorage.getItem('test-panel')).toBe('700');

	fill = 400;
	expect(panel.size).toBe(700);
});

it('keeps following the default after a click without a drag', () => {
	let fill = $state(500);
	const panel = create(() => fill);

	drag(panel, 0);
	expect(localStorage.getItem('test-panel')).toBeNull();

	fill = 600;
	expect(panel.size).toBe(600);
});

it('prefers a saved size over the live default', () => {
	localStorage.setItem('test-panel', '350');
	let fill = $state(500);
	const panel = create(() => fill);
	expect(panel.size).toBe(350);

	fill = 900;
	expect(panel.size).toBe(350);
});

it('clamps a fixed default to the bounds', () => {
	expect(create(2000).size).toBe(1200);
	expect(create(260).size).toBe(260);
});
