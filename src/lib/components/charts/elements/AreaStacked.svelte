<script>
	import { getContext, createEventDispatcher } from 'svelte';

	import { area, line, curveLinear } from 'd3-shape';
	import { closestTo } from 'date-fns';

	const { data, xGet, xScale, yScale, zGet, yGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	/** @type {string|null} */
	export let fill = null;

	export let clipPathId = '';

	export let highlightId = '';

	export let display = 'area';

	/** @type {*} */
	export let curveType = curveLinear;

	$: compareDates = [...new Set(dataset.map((d) => d.date))];

	$: areaGen = area()
		.x((d) => $xGet(d))
		.y0((d) => $yScale(d[0]))
		.y1((d) => $yScale(d[1]))
		.curve(curveType)
		.defined((d) => !isNaN(d[0]) && !isNaN(d[1]));

	$: lineGen = line(
		(d) => $xGet(d),
		(d) => $yGet(d)
	)
		.curve(curveType)
		.defined((d) => d.value !== null && !isNaN(d.value));

	$: opacity = (d) => {
		if (highlightId === null || highlightId === '') return 1;
		return highlightId === d.key || highlightId === d.group ? 1 : 0.1;
	};

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
		} else if (evt.touches) {
			const rect = evt.target.getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const xInvert = $xScale.invert(offsetX);
		const closest = closestTo(new Date(xInvert), compareDates);
		const found = dataset.find((d) => d.time === closest?.getTime());

		return { data: found, key };
	}

	/**
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} key
	 */
	function pointermove(evt, key) {
		const item = findItem(evt, key);
		dispatch('mousemove', item);
	}

	/**
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} key
	 */
	function pointerup(evt, key) {
		const item = findItem(evt, key);
		dispatch('pointerup', item.data);
	}

	function mouseout() {
		dispatch('mouseout');
	}
</script>

<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	{#each $data as d, i (i)}
		<path
			role="presentation"
			class="path-area focus:outline-0"
			d={display === 'area' ? areaGen(d) : lineGen(d.values)}
			fill={display === 'area' ? getZFill(d) : 'transparent'}
			stroke={display === 'area' ? 'none' : $zGet(d)}
			stroke-width={display === 'area' ? '0' : '2px'}
			opacity={opacity(d)}
			on:mousemove={(e) => pointermove(e, d.key || d.group)}
			on:mouseout={mouseout}
			on:touchmove={(e) => pointermove(e, d.key || d.group)}
			on:blur={mouseout}
			on:pointerup={(e) => pointerup(e, d.key || d.group)}
		/>
	{/each}
</g>
