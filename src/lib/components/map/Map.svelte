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
	import { contrast } from 'chroma-js';

	/** @type {string}*/
	export let mode = 'live';
	export let data = null;

	const absRound = (val) => Math.abs(Math.round(val));

	$: stateData = data.rows.reduce((acc, row) => {
		acc[row.state] = row;
		return acc;
	}, {});

	$: priceColourScale = createPriceScale(1000);
	$: intensityColourScale = createIntensityScale(500);

	/**
	 * Get the fill colour for the state based on the map mode and data
	 * @param {string} state
	 */
	$: getStateFillColour = (state) => {
		if (!data) return '#FFFFFF';

		let scale = priceColourScale;
		let key = 'price';

		if (mode === 'annual') {
			scale = intensityColourScale;
			key = 'intensity';
		}

		return scale(stateData[state][key]);
	};

	/**
	 * Get the text colour for a state, making sure it has contrast to the fill colour
	 * @param {string} state
	 */
	$: getStateTextColour = (state) => {
		const fill = getStateFillColour(state);
		return contrast(fill, '#FFFFFF') > 4.5 ? '#FFFFFF' : '#000000';
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
			text={mode === 'live' ? `$${stateData.TAS.price}` : stateData.TAS.intensity}
			colour="#000000"
			x={515}
			y={552}
			bg={true}
			textAnchor="left"
		/><!-- Tas -->
		<MapLabel text="N/A" colour="#6A6A6A" x={310} y={170} /><!-- NT -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.SA.price}` : stateData.SA.intensity}
			colour={getStateTextColour('SA')}
			x={330}
			y={330}
		/><!-- SA -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.VIC.price}` : stateData.VIC.intensity}
			colour="#000000"
			x={560}
			y={498}
			bg={true}
			textAnchor="left"
		/><!-- VIC -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.WA.price}` : stateData.WA.intensity}
			colour={getStateTextColour('WA')}
			x={130}
			y={263}
		/><!-- WA -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.QLD.price}` : stateData.QLD.intensity}
			colour={getStateTextColour('QLD')}
			x={480}
			y={229}
		/><!-- QLD -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.NSW.price}` : stateData.NSW.intensity}
			colour={getStateTextColour('NSW')}
			x={500}
			y={383}
		/><!-- NSW -->

		{#if data.flows}
			<!-- FLOWS -->
			<Flow
				direction={data.flows['NSW1->QLD1'] > 0 ? 'up' : 'down'}
				flow={absRound(data.flows['NSW1->QLD1'])}
				x={500}
				y={315}
			/><!-- QLD <-> NSW -->
			<Flow
				direction={data.flows['NSW1->VIC1'] > 0 ? 'down' : 'up'}
				flow={absRound(data.flows['NSW1->VIC1'])}
				x={480}
				y={430}
			/><!-- VIC <-> NSW -->
			<Flow
				direction={data.flows['TAS1->VIC1'] > 0 ? 'up' : 'down'}
				flow={absRound(data.flows['TAS1->VIC1'])}
				x={490}
				y={495}
			/><!-- VIC <-> TAS -->
			<Flow
				direction={data.flows['SA1->VIC1'] > 0 ? 'right' : 'left'}
				flow={absRound(data.flows['SA1->VIC1'])}
				x={418}
				y={440}
			/><!-- VIC <-> SA -->
		{/if}
	{/if}
</svg>
