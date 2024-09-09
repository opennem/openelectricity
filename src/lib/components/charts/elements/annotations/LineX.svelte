<script>
	import { getContext } from 'svelte';
	const { padding, xGet, height } = getContext('LayerCake');

	export let strokeArray = '2, 2';
	export let strokeColour = 'black';

	/** @type {{date: Date} | undefined} */
	export let xValue = undefined;

	let x = 0;

	$: if (xValue) {
		x = $xGet(xValue);
	}
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	<line x1={x} y1="0" x2={x} y2={$height} stroke-dasharray={strokeArray} stroke={strokeColour} />
</g>
