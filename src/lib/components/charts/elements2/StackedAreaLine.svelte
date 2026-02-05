<script>
	import { getContext } from 'svelte';
	import { area, line, curveLinear } from 'd3-shape';
	import { closestTo } from 'date-fns';
	const { data, xGet, xScale, yScale, yGet, z } = getContext('LayerCake');
	// import Area from '../elements/Area.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string|null} [fill]
	 * @property {string|null} [_fill]
	 * @property {string} [clipPathId]
	 * @property {string} [highlightId]
	 * @property {string} [display]
	 * @property {*} [curveType]
	 * @property {Object.<string, string>} [seriesColours]
	 * @property {string} [strokeWidth]
	 * @property {boolean} [showLineDots]
	 * @property {boolean} [showLineArea]
	 * @property {boolean} [_showLineArea]
	 * @property {string} [dotStroke]
	 * @property {string} [dotFill]
	 * @property {number} [dotRadius]
	 * @property {string} [dotStrokeWidth]
	 * @property {(evt: { data: TimeSeriesData, key: string }) => void} onmousemove
	 * @property {() => void} onmouseout
	 * @property {(evt: TimeSeriesData) => void} onpointerup
	 */

	/** @type {Props} */
	let {
		dataset = [],
		_fill = null,
		clipPathId = '',
		highlightId = '',
		display = 'area',
		curveType = curveLinear,
		seriesColours = {},
		strokeWidth = '1.5',
		showLineDots = false,
		_showLineArea = false,
		dotStroke = 'black',
		dotFill = 'white',
		dotRadius = 3,
		dotStrokeWidth = '1px',
		onmousemove,
		onmouseout,
		onpointerup
	} = $props();

	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);

	let areaGen = $derived(
		area()
			.x((/** @type {any} */ d) => $xGet(d))
			.y0((/** @type {any} */ d) => $yScale(d[0]))
			.y1((/** @type {any} */ d) => $yScale(d[1]))
			.curve(curveType)
			.defined((/** @type {any} */ d) => !isNaN(d[0]) && !isNaN(d[1]))
	);

	let lineGen = $derived(
		line(
			(/** @type {any} */ d) => $xGet(d),
			(/** @type {any} */ d) => $yGet(d)
		)
			.curve(curveType)
			.defined((/** @type {any} */ d) => d.value !== null && !isNaN(d.value))
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
		if (item.data) {
			onmousemove?.({ data: item.data, key: item.key });
		}
	}

	/**
	 * @param {MouseEvent|TouchEvent} evt
	 * @param {string} key
	 */
	function pointerup(evt, key) {
		const item = findItem(evt, key);
		if (item.data) {
			onpointerup?.(item.data);
		}
	}

	function mouseout() {
		onmouseout?.();
	}
</script>

{#if display === 'line'}
	{#each $data as d, i (i)}
		{#if showLineDots && d.values.length > 1}
			{#each d.values as point (point.time)}
				<circle
					class="focus:outline-0"
					role="presentation"
					cx={$xGet(point)}
					cy={$yGet(point)}
					r={dotRadius}
					fill={dotFill}
					stroke={dotStroke}
					stroke-width={dotStrokeWidth}
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
			stroke={seriesColours[$z(d)]}
			stroke-width={strokeWidth}
			opacity={lineOpacity(d)}
		/>

		<!-- TODO: this is not working -->
		<!-- {#if showLineArea}
			<Area fill={seriesColours[$z(d)]} />
		{/if} -->
	{/each}
{/if}

{#if display === 'area'}
	<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
		{#each $data as d, i (i)}
			<path
				role="presentation"
				class="path-area focus:outline-0"
				d={areaGen(d)}
				fill={seriesColours[$z(d)]}
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
