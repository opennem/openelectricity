<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleUtc } from 'd3-scale';

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

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string} [id]
	 * @property {string} [key]
	 * @property {string} [fuelTechId]
	 * @property {string} [title]
	 * @property {string} [colour]
	 * @property {boolean} [showIcon]
	 * @property {string} [displayUnit]
	 * @property {boolean} [isTechnologyDisplay]
	 * @property {*} [overlay] - If true, overlay will take up the full width of the chart
If object with xStartValue and xEndValue, overlay will be a range
	 * @property {string} [overlayStroke]
	 * @property {*} [overlayLine]
	 * @property {Date[] | undefined} [xTicks]
	 * @property {TimeSeriesData | undefined} [hoverData]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		dataset = [],
		id = '',
		key = '',
		fuelTechId = '',
		title = '',
		colour = '#000',
		showIcon = false,
		displayUnit = '',
		isTechnologyDisplay = false,
		overlay = null,
		overlayStroke = 'rgba(236, 233, 230, 0.4)',
		overlayLine = false,
		xTicks = undefined,
		hoverData = undefined,
		...rest
	} = $props();
	let hoverTime = $derived(hoverData ? hoverData.time || 0 : 0);
	let hoverValue = $derived(hoverData ? hoverData[key] || 0 : 0);
	let hoverPercentage = $derived(
		hoverData && hoverData._max ? (hoverValue / hoverData._max) * 100 : 0
	);
	let maxValue = $derived(Math.round(Math.max(...dataset.map((d) => d[key] || 0))));
	let maxY = $derived(maxValue > 0 ? maxValue : 10);
</script>

<div {...rest}>
	<KeyHeader {key} {title} {fuelTechId} data={hoverData} {showIcon}>
		{#if hoverData}
			{formatValue(hoverValue)}

			{#if isTechnologyDisplay}
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
			xScale={scaleUtc()}
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
