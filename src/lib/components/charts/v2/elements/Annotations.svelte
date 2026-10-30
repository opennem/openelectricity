<script>
	/**
	 * Annotations Element
	 *
	 * Renders SVG shapes and text annotations at data coordinates.
	 * Supports rect, circle, line and text with rotation and custom styles.
	 */
	import { getContext } from 'svelte';
	import {
		toDateValue,
		rectDefaults,
		circleDefaults,
		lineDefaults,
		textDefaults,
		textTransform
	} from './annotations-helpers.js';

	const { xScale, yScale, padding } = getContext('LayerCake');

	/** @typedef {import('./annotations-helpers.js').Annotation} Annotation */

	/**
	 * @typedef {Object} Props
	 * @property {Annotation[]} items - Array of annotation items to render
	 * @property {boolean} [hideOnMobile] - Hide annotations on mobile viewports
	 */

	/** @type {Props} */
	let { items = [], hideOnMobile = false } = $props();

	/**
	 * Convert a data x value (Date or number) to pixel position
	 * @param {Date | number} val
	 */
	function px(val) {
		return $xScale(toDateValue(val));
	}

	/**
	 * Convert a data y value to pixel position
	 * @param {number} val
	 */
	function py(val) {
		return $yScale(val);
	}
</script>

<g class="annotations-group pointer-events-none" class:hide-mobile={hideOnMobile}>
	{#each items as item, i (i)}
		{#if item.type === 'rect'}
			<rect
				x={px(item.x)}
				y={py(item.y)}
				width={item.width}
				height={item.height}
				fill={item.fill ?? 'none'}
				stroke={item.stroke ?? 'none'}
				stroke-width={item.strokeWidth ?? 1}
				opacity={item.opacity ?? 1}
				rx={item.rx ?? 0}
			/>
		{:else if item.type === 'circle'}
			<circle
				cx={px(item.x)}
				cy={py(item.y)}
				r={item.r}
				fill={item.fill ?? 'none'}
				stroke={item.stroke ?? 'none'}
				stroke-width={item.strokeWidth ?? 1}
				opacity={item.opacity ?? 1}
			/>
		{:else if item.type === 'line'}
			<line
				x1={px(item.x1)}
				y1={py(item.y1)}
				x2={px(item.x2)}
				y2={py(item.y2)}
				stroke={item.stroke ?? '#666'}
				stroke-width={item.strokeWidth ?? 1}
				stroke-dasharray={item.strokeDasharray ?? 'none'}
				opacity={item.opacity ?? 1}
			/>
		{:else if item.type === 'text'}
			<text
				x={px(item.x) + (item.dx ?? 0)}
				y={py(item.y) + (item.dy ?? 0)}
				transform={item.rotate
					? `rotate(${item.rotate}, ${px(item.x) + (item.dx ?? 0)}, ${py(item.y) + (item.dy ?? 0)})`
					: undefined}
				fill={item.fill ?? '#333'}
				font-size={item.fontSize ?? '12px'}
				font-weight={item.fontWeight ?? 'normal'}
				text-anchor={item.textAnchor ?? 'start'}
				dominant-baseline={item.dominantBaseline ?? 'auto'}
				opacity={item.opacity ?? 1}
			>
				{item.text}
			</text>
		{/if}
	{/each}
</g>

<style>
	@media (max-width: 767px) {
		.hide-mobile {
			display: none;
		}
	}
</style>
