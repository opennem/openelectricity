<script>
	import { getContext } from 'svelte';

	import { area, line, curveLinear } from 'd3-shape';
	import { closestTo } from 'date-fns';

	const { data, xGet, xScale, yScale, zGet, yGet } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string|null} [fill]
	 * @property {string} [clipPathId]
	 * @property {string} [highlightId]
	 * @property {string} [display]
	 * @property {*} [curveType]
	 * @property {(evt: { data: any, key: string }) => void} [onmousemove]
	 * @property {() => void} [onmouseout]
	 * @property {(evt: any) => void} [onpointerup]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		fill = null,
		clipPathId = '',
		highlightId = '',
		display = 'area',
		curveType = curveLinear,
		onmousemove,
		onmouseout,
		onpointerup
	} = $props();

	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);

	let areaGen = $derived(
		area()
			.x((d) => $xGet(d))
			.y0((d) => $yScale(d[0]))
			.y1((d) => $yScale(d[1]))
			.curve(curveType)
			.defined((d) => !isNaN(/** @type {any} */ (d)[0]) && !isNaN(/** @type {any} */ (d)[1]))
	);

	let lineGen = $derived(
		line(
			(d) => $xGet(d),
			(d) => $yGet(d)
		)
			.curve(curveType)
			.defined((d) => /** @type {any} */ (d).value !== null && !isNaN(/** @type {any} */ (d).value))
	);

	let lineOpacity = $derived((/** @type {any} */ d) => {
		if (highlightId === null || highlightId === '') return 1;
		return highlightId === d.key || highlightId === d.group ? 1 : 0.3;
	});
	let areaOpacity = $derived((/** @type {any} */ d) => {
		if (highlightId === null || highlightId === '') return 1;
		return highlightId === d.key || highlightId === d.group ? 1 : 0.5;
	});

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
		if ('offsetX' in evt && typeof evt.offsetX === 'number') {
			offsetX = evt.offsetX;
		} else if ('touches' in evt && evt.touches) {
			const rect = /** @type {Element} */ (evt.target).getBoundingClientRect();
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
		onmousemove?.(item);
	}

	/**
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} key
	 */
	function pointerup(evt, key) {
		const item = findItem(evt, key);
		onpointerup?.(item.data);
	}

	function mouseout() {
		onmouseout?.();
	}
</script>

{#if display === 'line'}
	{#each $data as d, i (i)}
		{#if d.values.length > 1}
			{#each d.values as point (point.time)}
				<circle
					class="focus:outline-0"
					role="presentation"
					cx={$xGet(point)}
					cy={$yGet(point)}
					r="5"
					fill="transparent"
					stroke-width="0"
					onmousemove={(e) => pointermove(e, d.key || d.group)}
					onmouseout={mouseout}
					ontouchmove={(e) => pointermove(e, d.key || d.group)}
					onblur={mouseout}
					onpointerup={(e) => pointerup(e, d.key || d.group)}
				/>
			{/each}
		{/if}

		<path
			role="presentation"
			class="path-area focus:outline-0 pointer-events-none"
			d={lineGen(d.values)}
			fill="transparent"
			stroke={$zGet(d)}
			stroke-width="1.5"
			opacity={lineOpacity(d)}
		/>
	{/each}
{/if}

{#if display === 'area'}
	<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
		{#each $data as d, i (i)}
			<path
				role="presentation"
				class="path-area focus:outline-0"
				d={areaGen(d)}
				fill={getZFill(d)}
				stroke="none"
				stroke-width="0"
				opacity={areaOpacity(d)}
				onmousemove={(e) => pointermove(e, d.key || d.group)}
				onmouseout={mouseout}
				ontouchmove={(e) => pointermove(e, d.key || d.group)}
				onblur={mouseout}
				onpointerup={(e) => pointerup(e, d.key || d.group)}
			/>
		{/each}
	</g>
{/if}
