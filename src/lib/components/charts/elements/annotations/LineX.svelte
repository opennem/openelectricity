<script>
	import { run } from 'svelte/legacy';

	import { getContext } from 'svelte';
	const { padding, xGet, height } = getContext('LayerCake');


	
	/**
	 * @typedef {Object} Props
	 * @property {string} [strokeArray]
	 * @property {string} [strokeColour]
	 * @property {{date: Date} | undefined} [xValue]
	 */

	/** @type {Props} */
	let { strokeArray = '2, 2', strokeColour = 'black', xValue = undefined } = $props();

	let x = $state(0);

	run(() => {
		if (xValue) {
			x = $xGet(xValue);
		}
	});
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	<line x1={x} y1="0" x2={x} y2={$height} stroke-dasharray={strokeArray} stroke={strokeColour} />
</g>
