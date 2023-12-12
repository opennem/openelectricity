<script>
	import { best } from 'wcag-color';
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

	/** @type {string}*/
	export let mode = 'live';
	export let data = null;

	$: stateData = data.rows.reduce((acc, row) => {
		acc[row.state] = row;
		return acc;
	}, {});

	const absRound = (val) => Math.abs(Math.round(val));
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
	<Tas fill="#ff000088" />
	<Nsw fill="#ff000088" />
	<Qld fill="#ff000088" />
	<Wa fill="#ff000088" />
	<Vic fill="#ff000088" />
	<Sa fill="#ff000088" />
	<Nt fill="#F1F0ED" />

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
			colour={best('#ffffff', '#000000', '#ff000088')}
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
			colour={best('#ffffff', '#000000', '#ff000088')}
			x={130}
			y={263}
		/><!-- WA -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.QLD.price}` : stateData.QLD.intensity}
			colour={best('#ffffff', '#000000', '#ff000088')}
			x={480}
			y={229}
		/><!-- QLD -->
		<MapLabel
			text={mode === 'live' ? `$${stateData.NSW.price}` : stateData.NSW.intensity}
			colour={best('#ffffff', '#000000', '#ff000088')}
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
