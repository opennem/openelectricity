<script>
	import Flow from './Flow.svelte';
	import MapLabel from './MapLabel.svelte';
	import TextureMask from './TextureMask.svelte';
	import Nsw from './states/NSW.svelte';
	import Nt from './states/NT.svelte';
	import Qld from './states/QLD.svelte';
	import Sa from './states/SA.svelte';
	import Tas from './states/TAS.svelte';
	import Vic from './states/VIC.svelte';
	import Wa from './states/WA.svelte';
	import { createIntensityScale, createPriceScale } from '$lib/colours';
	import chroma from 'chroma-js';

	import {
		priceColour,
		intensityColour
	} from '$lib/components/info-graphics/system-snapshot/helpers';

	/** @type {'live' | 'annual'} */
	export let mode = 'live';
	export let data = null;
	export let flows = null;
	export let prices = null;
	export let intensity = null;

	const absRound = (val) => Math.abs(Math.round(val));
	const auDollar = new Intl.NumberFormat('en-AU', {
		style: 'currency',
		currency: 'AUD'
	});

	const auNumber = new Intl.NumberFormat('en-AU', {
		// minimumFractionDigits: 2,
		maximumFractionDigits: 0
	});

	$: stateData = data.rows.reduce((acc, row) => {
		acc[row.state] = row;
		return acc;
	}, {});

	$: priceColourScale = createPriceScale(1000);
	$: intensityColourScale = createIntensityScale(500);

	$: modeLive = mode === 'live';

	$: tasText =
		prices && modeLive ? `${auDollar.format(prices.TAS1)}` : auNumber.format(intensity.TAS);
	$: vicText =
		prices && modeLive ? `${auDollar.format(prices.VIC1)}` : auNumber.format(intensity.VIC);
	$: saText = prices && modeLive ? `${auDollar.format(prices.SA1)}` : auNumber.format(intensity.SA);
	$: qldText =
		prices && modeLive ? `${auDollar.format(prices.QLD1)}` : auNumber.format(intensity.QLD);
	$: nswText =
		prices && modeLive ? `${auDollar.format(prices.NSW1)}` : auNumber.format(intensity.NSW);
	$: waText = prices && modeLive ? '' : auNumber.format(intensity.WA);

	/**
	 * Get the fill colour for the state based on the map mode and data
	 * @param {string} state
	 * @returns {string}
	 */
	$: getStateFillColour = (state) => {
		// if (!data) return '#FFFFFF';

		const scale = modeLive ? priceColourScale : intensityColourScale;

		// console.log('.prices[state]', prices, prices[state]);

		// console.log('prices', state, prices[`${state}1`], priceColour(prices[`${state}1`]));

		// const iColour = state === 'TAS' ? 0 : intensity[state];

		return modeLive
			? priceColour(prices[`${state}1`]) || '#FFFFFF'
			: intensityColour(intensity[state]);
	};

	/**
	 * Get the text colour for a state, making sure it has contrast to the fill colour
	 * @param {string} state
	 */
	$: getStateTextColour = (state) => {
		const fill = getStateFillColour(state) || '#FFFFFF';
		return chroma.contrast(fill.toString(), '#FFFFFF') > 4.5 ? '#FFFFFF' : '#000000';
	};
</script>

<svg
	width="615"
	height="578"
	viewBox="0 0 615 578"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	class={`overflow-visible w-full h-auto block ${$$restProps.class}`}
>
	<!-- State geometry -->
	<Tas fill={getStateFillColour('TAS')} />
	<Nsw fill={getStateFillColour('NSW')} />
	<Qld fill={getStateFillColour('QLD')} />
	<Wa fill={getStateFillColour('WA')} />
	<Vic fill={getStateFillColour('VIC')} />
	<Sa fill={getStateFillColour('SA')} />
	<Nt fill="#FFFFFF" />

	<TextureMask />

	<!-- Vic Arrow -->
	<circle cx="485.459" cy="457.353" r="3.44336" fill="white" stroke="black" stroke-width="1.5" />
	<path d="M488.109 458.657L554.594 492.728" stroke="black" stroke-dasharray="3 2" />

	{#if data}
		<!-- PRICE/EMISSIONS LABELS -->
		<MapLabel
			text={tasText}
			colour="#000000"
			x={515}
			y={552}
			bg={true}
			textAnchor="left"
		/><!-- Tas -->
		<MapLabel text="N/A" colour="#6A6A6A" x={310} y={170} /><!-- NT -->
		<MapLabel text={saText} colour={getStateTextColour('SA')} x={330} y={330} /><!-- SA -->
		<MapLabel
			text={vicText}
			colour="#000000"
			x={560}
			y={498}
			bg={true}
			textAnchor="left"
		/><!-- VIC -->
		<MapLabel text={waText} colour={getStateTextColour('WA')} x={130} y={263} /><!-- WA -->
		<MapLabel text={qldText} colour={getStateTextColour('QLD')} x={480} y={229} /><!-- QLD -->
		<MapLabel text={nswText} colour={getStateTextColour('NSW')} x={500} y={383} /><!-- NSW -->

		{#if modeLive && flows}
			<!-- FLOWS -->
			<Flow
				direction={flows['NSW1->QLD1'] > 0 ? 'up' : 'down'}
				flow={absRound(flows['NSW1->QLD1'])}
				x={500}
				y={315}
			/><!-- QLD <-> NSW -->
			<Flow
				direction={flows['NSW1->VIC1'] > 0 ? 'down' : 'up'}
				flow={absRound(flows['NSW1->VIC1'])}
				x={480}
				y={430}
			/><!-- VIC <-> NSW -->
			<Flow
				direction={flows['TAS1->VIC1'] > 0 ? 'up' : 'down'}
				flow={absRound(flows['TAS1->VIC1'])}
				x={490}
				y={495}
			/><!-- VIC <-> TAS -->
			<Flow
				direction={flows['SA1->VIC1'] > 0 ? 'right' : 'left'}
				flow={absRound(flows['SA1->VIC1'])}
				x={418}
				y={440}
			/><!-- VIC <-> SA -->
		{/if}
	{/if}
</svg>
