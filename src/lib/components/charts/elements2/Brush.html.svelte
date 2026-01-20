<!--
  @component
  Adds a brush component to create a range between 0 and 1. Bind to the `min` and `max` props to use them in other components. See the [brushable example](https://layercake.graphcics/example/Brush) for use.
 -->
<script>
	import { getContext } from 'svelte';
	import clamp from '$lib/utils/clamp';
	const { xScale } = getContext('LayerCake');

	let { onbrush } = $props();

	let mouse = $state({ x: 0, y: 0 });

	/** @type {number | null} min - The brush's min value. Useful to bind to. */
	let min = $state(null);

	/** @type {number | null} max - The brush's max value. Useful to bind to. */
	let max = $state(null);

	/** @type {*} */
	let brush = $state();
	/** @type {*} */
	let brushInner = $state();

	let left = $derived(min ? 100 * min : 0);
	let right = $derived(max ? 100 * (1 - max) : 1);

	export function clear() {
		min = null;
		max = null;

		onbrush();
	}

	// this prevents the brush from being too small
	$effect(() => {
		if (min === null || max === null) return;
		let range = (max - min) * 100;
		if (range < 0.5) {
			min = null;
			max = null;

			onbrush();
		}
	});

	const p = (x) => {
		const { left, right } = brush.getBoundingClientRect();
		return clamp((x - left) / (right - left), 0, 1);
	};

	/**
	 * @param {Function} fn
	 * @returns {(e: MouseEvent & { currentTarget: HTMLDivElement } | TouchEvent & { currentTarget: HTMLDivElement }) => void}
	 */
	const handler = (fn) => {
		return (e) => {
			e.stopPropagation();

			if (e.type === 'touchstart' && 'touches' in e) {
				if (e.touches.length !== 1) return;
				e = e.touches[0];
			}

			const id = 'identifier' in e ? e.identifier : null;
			const start = { min, max, p: p('clientX' in e ? e.clientX : e.touches[0].clientX) };

			const handle_move = (e) => {
				if (e.type === 'touchmove' && 'changedTouches' in e) {
					if (e.changedTouches.length !== 1) return;
					e = e.changedTouches[0];
					if (e.identifier !== id) return;
				}

				fn(start, p(e.clientX));
			};

			const handle_end = (e) => {
				if (e.type === 'touchend' && 'changedTouches' in e) {
					if (e.changedTouches.length !== 1) return;
					if (e.changedTouches[0].identifier !== id) return;
				} else if (e.target === brush) {
					clear();
				}

				window.removeEventListener('mousemove', handle_move);
				window.removeEventListener('mouseup', handle_end);

				window.removeEventListener('touchmove', handle_move);
				window.removeEventListener('touchend', handle_end);
			};

			window.addEventListener('mousemove', handle_move);
			window.addEventListener('mouseup', handle_end);

			window.addEventListener('touchmove', handle_move);
			window.addEventListener('touchend', handle_end);
		};
	};

	const reset = handler((start, p) => {
		min = clamp(Math.min(start.p, p), 0, 1);
		max = clamp(Math.max(start.p, p), 0, 1);
	});

	const move = handler((start, p) => {
		const d = clamp(p - start.p, -start.min, 1 - start.max);
		min = start.min + d;
		max = start.max + d;
	});

	const adjust_min = handler((start, p) => {
		min = p > start.max ? start.max : p;
		max = p > start.max ? p : start.max;
	});

	const adjust_max = handler((start, p) => {
		min = p < start.min ? p : start.min;
		max = p < start.min ? start.min : p;
	});

	function dispatchBrushed() {
		const range = $xScale.range();
		const start = min * range[1];
		const end = max * range[1];
		const invertStart = $xScale.invert(start);
		const invertEnd = $xScale.invert(end);

		onbrush([invertStart, invertEnd]);
	}

	$effect(() => {
		if ((min || min === 0) && (max || max === 0)) {
			dispatchBrushed();
		}
	});
</script>

<div class="relative w-full h-full">
	<div
		bind:this={brush}
		class="brush-outer rounded-lg"
		class:cursor-col-resize={min === null && max === null}
		class:cursor-zoom-out={min !== null && max !== null}
		onmousedown={reset}
		ontouchstart={reset}
		onpointermove={(event) => {
			mouse.x = event.clientX;
			mouse.y = event.clientY;
		}}
		role="slider"
		aria-valuenow={min}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuetext="{min} to {max}"
		tabindex="0"
	></div>

	{#if min !== null}
		<div
			bind:this={brushInner}
			class="brush-inner rounded-lg"
			onmousedown={move}
			ontouchstart={move}
			onpointermove={(event) => {
				mouse.x = event.clientX;
				mouse.y = event.clientY;
			}}
			style="left: {left}%; right: {right}%"
			role="slider"
			aria-valuenow={min}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuetext="{min} to {max}"
			tabindex="0"
		></div>
		<div
			class="brush-handle"
			onmousedown={adjust_min}
			ontouchstart={adjust_min}
			style="left: {left}%"
			role="slider"
			aria-valuenow={min}
			aria-valuetext="{min} to {max}"
			tabindex="0"
		></div>
		<div
			class="brush-handle"
			onmousedown={adjust_max}
			ontouchstart={adjust_max}
			style="right: {right}%"
			role="slider"
			aria-valuenow={max}
			aria-valuetext="{min} to {max}"
			tabindex="0"
		></div>
	{/if}

	<!-- <div
		bind:this={tooltip}
		class="fixed z-10 top-0 left-0 bg-dark-grey text-white px-1 text-xxs rounded-md pointer-events-none"
		style={styles}
	>
		{tooltipText}
	</div> -->
</div>

<style>
	/* css var for brush handle color */
	:root {
		--brush-handle-color: #e0603f;
	}
	.brush-outer {
		position: absolute;
		width: 100%;
		height: 100%;
	}

	.brush-inner {
		position: absolute;
		height: 100%;
		cursor: move;
		/* mix-blend-mode: difference; */
		background-color: #eae8e3;
		border: 1px solid var(--brush-handle-color);
	}

	.brush-handle {
		position: absolute;
		width: 0;
		height: 100%;
		cursor: ew-resize;
	}

	.brush-handle::before {
		position: absolute;
		content: '';
		width: 8px;
		left: -4px;
		height: 100%;
		background: transparent;
	}
	.brush-handle::after {
		position: absolute;
		content: '';
		width: 6px;
		left: -3px;
		height: 50%;
		top: 25%;
		background-color: var(--brush-handle-color);
		border-radius: 4px;
		z-index: 9999;
	}
</style>
