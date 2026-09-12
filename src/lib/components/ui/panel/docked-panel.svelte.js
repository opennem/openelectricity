import { onMount, tick } from 'svelte';
import { createResizeControl } from './resize-control.svelte.js';

/**
 * A resizable pane: a bounded size, the shared pointer/keyboard resize
 * control, an optionally remembered size, and — for docked side panels — the
 * focus hand-off between the panel's close control and the rail's opener.
 *
 * Size units are the caller's: pixels, or a percentage of a container when
 * `scale` converts pointer pixels. The effective size is clamped to the live
 * bounds, so a remembered size still fits after the viewport shrinks. A saved
 * size is restored after mount so server and first client paint agree.
 *
 * Must be called during component init.
 *
 * @param {{
 *   axis?: 'x' | 'y',
 *   initial: number,
 *   min: () => number,
 *   max: () => number,
 *   storageKey?: string,
 *   scale?: () => number,
 *   inverted?: boolean,
 *   step?: number,
 *   setOpen?: (open: boolean) => void,
 *   focusOnOpen?: () => HTMLElement | null | undefined
 * }} opts - `setOpen` applies an open/close request (URL state, a layout
 *   override); `focusOnOpen` overrides the element focused after opening,
 *   which defaults to the bound `closer`.
 */
export function createDockedPanel(opts) {
	const axis = opts.axis ?? 'x';
	let size = $state(opts.initial);
	let effectiveSize = $derived(Math.min(opts.max(), Math.max(opts.min(), size)));
	let opener = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));
	let closer = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));

	/** @param {number} value */
	function remember(value) {
		if (!opts.storageKey) return;
		try {
			localStorage.setItem(opts.storageKey, String(value));
		} catch {
			/* Resizing remains usable without persistence. */
		}
	}
	onMount(() => {
		if (!opts.storageKey) return;
		try {
			const saved = Number(localStorage.getItem(opts.storageKey));
			if (Number.isFinite(saved) && saved > 0) size = saved;
		} catch {
			/* Storage can be unavailable in embedded/private contexts. */
		}
	});

	const resize = createResizeControl({
		axis,
		get: () => effectiveSize,
		set: (value) => {
			size = value;
		},
		min: opts.min,
		max: opts.max,
		scale: opts.scale,
		inverted: opts.inverted,
		step: opts.step,
		commit: () => remember(size)
	});

	/** Apply the change, then hand keyboard focus to the control that appears.
	 * @param {boolean} open */
	async function setOpen(open) {
		opts.setOpen?.(open);
		await tick();
		(open ? (opts.focusOnOpen?.() ?? closer) : opener)?.focus();
	}

	return {
		/** The clamped size in the caller's units. */
		get size() {
			return effectiveSize;
		},
		get dragging() {
			return resize.dragging;
		},
		/** Handlers for the shared `DragHandle`. */
		get start() {
			return resize.start;
		},
		get keydown() {
			return resize.keydown;
		},
		/** Rail control that reopens the panel; focused after closing. */
		get opener() {
			return opener;
		},
		set opener(element) {
			opener = element;
		},
		/** The panel's close control; focused after opening. */
		get closer() {
			return closer;
		},
		set closer(element) {
			closer = element;
		},
		open: () => setOpen(true),
		close: () => setOpen(false)
	};
}
