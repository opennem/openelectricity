<script>
	import { getContext } from 'svelte';
	import { LayerCake, Svg, Html } from 'layercake';

	import Line from '$lib/components/charts/elements/Line.svelte';
	import Area from '$lib/components/charts/elements/Area.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';
	import Overlay from '$lib/components/charts/elements/Overlay.svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';
	import LineX from '$lib/components/charts/elements/annotations/LineX.svelte';

	import KeyHeader from './KeyHeader.svelte';

	import { formatFyTickX, formatTickY, displayXTicks, formatValue } from './helpers';

	const { isTechnologyDisplay } = getContext('scenario-filters');

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let id = '';
	export let key = '';
	export let fuelTechId = '';
	export let title = '';
	export let colour = '#000';
	export let showIcon = false;
	export let displayUnit = '';

	/** If true, overlay will take up the full width of the chart
	 * If object with xStartValue and xEndValue, overlay will be a range
	 * @type {*} */
	export let overlay = null;
	export let overlayStroke = 'rgba(236, 233, 230, 0.4)';
	/** @type {*} */
	export let overlayLine = false;

	/** @type {Date[] | undefined} */
	export let xTicks = undefined;

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
	$: hoverValue = hoverData ? hoverData[key] || 0 : 0;
	$: hoverPercentage = hoverData && hoverData._max ? (hoverValue / hoverData._max) * 100 : 0;
	$: maxValue = Math.round(Math.max(...dataset.map((d) => d[key] || 0)));
	$: maxY = maxValue > 0 ? maxValue : 10;
</script>

<div {...$$restProps}>
	<KeyHeader {key} {title} {fuelTechId} data={hoverData} {showIcon}>
		{#if hoverData}
			{formatValue(hoverValue)}

			{#if $isTechnologyDisplay}
				<small class="text-sm text-dark-grey font-light">
					({formatValue(hoverPercentage)}%)
				</small>
			{/if}

			<small class="block text-xs text-mid-grey font-light">{displayUnit}</small>
		{/if}
	</KeyHeader>

	<div style="height: 150px;">
		<LayerCake
			padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
			x={'date'}
			y={key}
			yDomain={[0, maxY]}
			data={dataset}
		>
			<Svg>
				{#if overlay}
					<Overlay fill="#FAF9F6" {...overlay} />
				{/if}
				<AxisX
					formatTick={hoverData ? () => '' : formatFyTickX}
					ticks={xTicks || displayXTicks}
					tickMarks={false}
					gridlines={false}
					snapTicks={true}
				/>
				<AxisY formatTick={formatTickY} tickMarks={true} ticks={[0, maxY]} />
				<Line stroke="#353535" {hoverData} strokeWidth="2px" />
				<Area fill={colour} />
				<HoverLayer {dataset} on:mousemove on:mouseout />
			</Svg>

			<Svg pointerEvents={false}>
				<defs>
					<HatchPattern id={`${id}-hatch-pattern`} stroke={overlayStroke} />
				</defs>
				{#if overlay}
					<Overlay fill="url(#{`${id}-hatch-pattern`})" {...overlay} />
				{/if}
				{#if overlayLine}
					<LineX xValue={overlayLine} />
				{/if}
			</Svg>

			<Html pointerEvents={false}>
				<HoverText {hoverData} position="bottom">
					<span class="text-[10px] block">
						{formatFyTickX(hoverTime)}
					</span>
				</HoverText>
				<HoverLine {hoverData} yTopOffset={6} lineColour={colour} />
			</Html>
		</LayerCake>
	</div>
</div>
