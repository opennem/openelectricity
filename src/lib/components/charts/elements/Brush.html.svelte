<!--
  @component
  Adds a brush component to create a range between 0 and 1. Bind to the `min` and `max` props to use them in other components. See the [brushable example](https://layercake.graphcics/example/Brush) for use.
 -->
<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import clamp from '$lib/utils/clamp';
	const { xScale } = getContext('LayerCake');

	/** @type {number | null} min - The brush's min value. Useful to bind to. */
	let min;

	/** @type {number | null} max - The brush's max value. Useful to bind to. */
	let max;

	/** @type {*} */
	let brush;

	export function clear() {
		min = null;
		max = null;
		dispatch('brushed', {
			start: null,
			end: null
		});
	}

	const dispatch = createEventDispatcher();

	const p = (x) => {
		const { left, right } = brush.getBoundingClientRect();
		return clamp((x - left) / (right - left), 0, 1);
	};

	const handler = (fn) => {
		return (e) => {
			if (e.type === 'touchstart') {
				if (e.touches.length !== 1) return;
				e = e.touches[0];
			}

			const id = e.identifier;
			const start = { min, max, p: p(e.clientX) };

			const handle_move = (e) => {
				if (e.type === 'touchmove') {
					if (e.changedTouches.length !== 1) return;
					e = e.changedTouches[0];
					if (e.identifier !== id) return;
				}

				fn(start, p(e.clientX));
			};

			const handle_end = (e) => {
				if (e.type === 'touchend') {
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

	$: left = min ? 100 * min : 0;
	$: right = max ? 100 * (1 - max) : 1;
	$: if ((min || min === 0) && (max || max === 0)) {
		dispatchBrushed();
	}
	$: console.log({ min, max, left, right });

	function dispatchBrushed() {
		const range = $xScale.range();
		const start = min * range[1];
		const end = max * range[1];
		const invertStart = $xScale.invert(start);
		const invertEnd = $xScale.invert(end);

		dispatch('brushed', {
			start: invertStart,
			end: invertEnd
		});
	}
</script>

<div
	bind:this={brush}
	class="brush-outer"
	on:mousedown|stopPropagation={reset}
	on:touchstart|stopPropagation={reset}
	role="slider"
	aria-valuenow={min}
	aria-valuemin={min}
	aria-valuemax={max}
	aria-valuetext="{min} to {max}"
	tabindex="0"
>
	{#if min !== null}
		<div
			class="brush-inner"
			on:mousedown|stopPropagation={move}
			on:touchstart|stopPropagation={move}
			style="left: {left}%; right: {right}%"
			role="slider"
			aria-valuenow={min}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuetext="{min} to {max}"
			tabindex="0"
		/>
		<div
			class="brush-handle"
			on:mousedown|stopPropagation={adjust_min}
			on:touchstart|stopPropagation={adjust_min}
			style="left: {left}%"
			role="slider"
			aria-valuenow={min}
			aria-valuetext="{min} to {max}"
			tabindex="0"
		/>
		<div
			class="brush-handle"
			on:mousedown|stopPropagation={adjust_max}
			on:touchstart|stopPropagation={adjust_max}
			style="right: {right}%"
			role="slider"
			aria-valuenow={max}
			aria-valuetext="{min} to {max}"
			tabindex="0"
		/>
	{/if}
</div>

<style>
	.brush-outer {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.brush-inner {
		position: absolute;
		height: 100%;
		cursor: move;
		/* mix-blend-mode: difference; */
		background: #f1f0ed;

		border-left: 1px solid #c6c6c6;
		border-right: 1px solid #c6c6c6;
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
</style>
