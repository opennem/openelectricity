<svelte:options namespace="svg" />

<script module>
	/** Room around a dial's outer radius for its hour ticks and labels, wider
	 *  for the lightbox's `large` labels.
	 * @param {boolean} [large] */
	export const dialMargin = (large = false) => (large ? 64 : 48);
</script>

<script>
	import { dialAngle } from './dial.js';

	/**
	 * DialFace — the 24-hour dials' 00/06/12/18 hour ticks and labels just
	 * outside the dial (noon at the top; see `dial.js`), inside its centred
	 * SVG. Each tick runs out from the dial's edge; each label is anchored by
	 * its inner edge, so all four sit the same `GAP` clear of the dial
	 * whatever their width or height. `large` (the lightbox) sets 16px labels
	 * with a longer tick and gap; fit it with `dialMargin(true)`.
	 *
	 * @type {{ outer: number, large?: boolean }}
	 */
	let { outer, large = false } = $props();

	let gap = $derived(large ? 14 : 10);
	/** Tick length, out from the dial's edge and short of the label. */
	let tick = $derived(large ? 9 : 6);
	/** Inner-edge anchoring per side: noon top, 18:00 right, midnight bottom,
	 *  06:00 left. */
	const LABELS = [
		{ hour: 12, anchor: 'middle', baseline: 'auto' },
		{ hour: 18, anchor: 'start', baseline: 'middle' },
		{ hour: 0, anchor: 'middle', baseline: 'hanging' },
		{ hour: 6, anchor: 'end', baseline: 'middle' }
	];
</script>

{#each LABELS as { hour, anchor, baseline } (hour)}
	{@const x = Math.round(Math.sin(dialAngle(hour)))}
	{@const y = -Math.round(Math.cos(dialAngle(hour)))}
	<line
		x1={x * outer}
		y1={y * outer}
		x2={x * (outer + tick)}
		y2={y * (outer + tick)}
		class="stroke-mid-grey"
		data-testid="dial-tick"
	/>
	<text
		x={x * (outer + gap)}
		y={y * (outer + gap)}
		text-anchor={anchor}
		dominant-baseline={baseline}
		class="fill-mid-grey {large ? 'text-base' : 'text-xs'}">{String(hour).padStart(2, '0')}:00</text
	>
{/each}
