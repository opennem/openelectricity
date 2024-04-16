<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { area } from 'd3-shape';
	import { closestTo } from 'date-fns';

	const { data, xGet, xScale, yScale, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	/** @type {string|null} */
	export let fill = null;

	export let clipPathId = '';

	$: compareDates = [...new Set(dataset.map((d) => d.date))];

	$: areaGen = area()
		.x((d) => $xGet(d))
		.y0((d) => $yScale(d[0]))
		.y1((d) => $yScale(d[1]));

	/**
	 * @param d {[]}
	 * @returns {string}
	 */
	function getZFill(d) {
		return fill ? fill : $zGet(d);
	}

	/**
	 * this function looks for the closest date to the mouse position
	 * and returns the data for that date
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} key
	 */
	function findItem(evt, key) {
		let offsetX;
		if (evt.offsetX) {
			offsetX = evt.offsetX;
		} else {
			const rect = evt.target.getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const xInvert = $xScale.invert(offsetX);
		const closest = closestTo(new Date(xInvert), compareDates);
		const found = dataset.find((d) => d.time === closest?.getTime());

		dispatch('mousemove', { data: found, key });
	}

	function mouseout() {
		dispatch('mouseout');
	}
</script>

<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	{#each $data as d}
		<path
			role="presentation"
			class="path-area focus:outline-0"
			d={areaGen(d)}
			fill={getZFill(d)}
			on:mousemove={(e) => findItem(e, d.key)}
			on:mouseout={mouseout}
			on:touchmove={(e) => findItem(e, d.key)}
			on:touchend={mouseout}
			on:blur={mouseout}
		/>
	{/each}
</g>
