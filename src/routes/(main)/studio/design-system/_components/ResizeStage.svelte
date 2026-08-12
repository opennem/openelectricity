<script>
	/**
	 * ResizeStage — a centred, width-resizable stage for testing a specimen at
	 * different widths. Side drag handles (the shared panel DragHandle grip)
	 * resize symmetrically about the centre, so dragging either edge by 1px
	 * changes the width by 2px.
	 */

	import { DragHandle } from '$lib/components/ui/panel/index.js';

	/**
	 * @typedef {Object} Props
	 * @property {number} [initial] - starting width in px
	 * @property {number} [min] - minimum width in px
	 * @property {import('svelte').Snippet} children
	 */

	/** @type {Props} */
	let { initial = 560, min = 420, children } = $props();

	// svelte-ignore state_referenced_locally
	let width = $state(initial);
	/** @type {HTMLDivElement | undefined} */
	let outerEl = $state();
	/** @type {AbortController | undefined} */
	let dragAbort;

	// Abort any in-flight drag on unmount so no window listeners outlive the stage.
	$effect(() => () => dragAbort?.abort());

	/**
	 * @param {PointerEvent} e
	 * @param {1 | -1} dir - 1 for the right handle, -1 for the left
	 */
	function startDrag(e, dir) {
		e.preventDefault();
		dragAbort?.abort();
		const startX = e.clientX;
		const startWidth = width;
		const max = (outerEl?.clientWidth ?? Infinity) - 32;
		const controller = new AbortController();
		dragAbort = controller;
		const { signal } = controller;

		window.addEventListener(
			'pointermove',
			(ev) => {
				width = Math.min(max, Math.max(min, startWidth + (ev.clientX - startX) * 2 * dir));
			},
			{ signal }
		);
		window.addEventListener('pointerup', () => controller.abort(), { signal });
		window.addEventListener('pointercancel', () => controller.abort(), { signal });
	}
</script>

<div bind:this={outerEl} class="flex items-stretch justify-center w-full select-none">
	<DragHandle
		axis="x"
		active={true}
		onstart={(e) => startDrag(e, -1)}
		class="rounded-full h-40 self-center"
	/>
	<div style:width="{width}px" class="max-w-full min-w-0">
		{@render children()}
	</div>
	<DragHandle
		axis="x"
		active={true}
		onstart={(e) => startDrag(e, 1)}
		class="rounded-full h-40 self-center"
	/>
</div>
