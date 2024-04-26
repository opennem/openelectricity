<script>
	import { createEventDispatcher } from 'svelte';
	import chroma from 'chroma-js';
	import { createIntensityScale, createPriceScale } from '$lib/colours';

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

	import CrossBorderExport from '$lib/components/info-graphics/system-snapshot/CrossBorderExport.svelte';

	import { priceColour } from '$lib/components/info-graphics/system-snapshot/helpers';

	import { carbonIntensityColour } from '$lib/stores/theme';

	import { writable } from 'svelte/store';
	import { createPopperActions } from 'svelte-popperjs';
	const [popperRef, popperContent] = createPopperActions({
		placement: 'top',
		strategy: 'fixed'
	});
	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 8] } }]
	};

	let x = 0;
	let y = 0;
	const mousemove = (ev) => {
		x = ev.clientX;
		y = ev.clientY - 8;
	};

	$: getBoundingClientRect = () => ({
		width: 0,
		height: 0,
		top: y,
		bottom: y,
		left: x,
		right: x
	});
	const virtualElement = writable({ getBoundingClientRect });
	$: $virtualElement = { getBoundingClientRect };
	popperRef(virtualElement);

	let showTooltip = false;

	/** @type {'live' | 'annual'} */
	export let mode = 'live';
	export let data = null;
	export let flows = null;
	export let prices = null;
	export let intensity = null;
	export let highlight;

	const absRound = (val) => auNumber.format(Math.abs(Math.round(val)));
	const auDollar = new Intl.NumberFormat('en-AU', {
		style: 'currency',
		currency: 'AUD'
	});

	const auNumber = new Intl.NumberFormat('en-AU', {
		// minimumFractionDigits: 2,
		maximumFractionDigits: 0
	});

	const dispatch = createEventDispatcher();

	const regions = [
		{
			id: 'NSW',
			component: Nsw,
			interaction: true
		},
		{
			id: 'QLD',
			component: Qld,
			interaction: true
		},
		{
			id: 'SA',
			component: Sa,
			interaction: true
		},
		{
			id: 'TAS',
			component: Tas,
			interaction: true
		},
		{
			id: 'VIC',
			component: Vic,
			interaction: true
		},
		{
			id: 'WA',
			component: Wa,
			interaction: true
		},
		{
			id: 'NT',
			component: Nt,
			interaction: false
		}
	];

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

		// const scale = modeLive ? priceColourScale : intensityColourScale;

		// console.log('.prices[state]', prices, prices[state]);

		// console.log('prices', state, prices[`${state}1`], priceColour(prices[`${state}1`]));

		// const iColour = state === 'TAS' ? 0 : intensity[state];

		return modeLive
			? priceColour(prices[`${state}1`]) || '#FFFFFF'
			: $carbonIntensityColour(intensity[state]);
	};

	/**
	 * Get the text colour for a state, making sure it has contrast to the fill colour
	 * @param {string} state
	 */
	$: getStateTextColour = (state) => {
		const fill = getStateFillColour(state) || '#FFFFFF';
		return chroma.contrast(fill.toString(), '#FFFFFF') > 4.5 ? '#FFFFFF' : '#000000';
	};

	function regionEnter(region) {
		dispatch('hover', { region });
	}
	function regionLeave() {
		dispatch('hover');
	}

	let flowRegions = '';
	let flowValue = 0;

	function flowEnter(flow, value) {
		flowRegions = flow;
		flowValue = value;
		showTooltip = true;
	}
	function flowLeave() {
		flowRegions = '';
		flowValue = 0;
		showTooltip = false;
	}
</script>

<svelte:window on:mousemove={mousemove} />

{#if showTooltip}
	<div class="hidden md:block" use:popperContent={extraOpts}>
		<CrossBorderExport regions={flowRegions} value={flowValue} />
	</div>
{/if}
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
	{#each regions as { id, component, interaction }}
		<g
			role="group"
			on:mouseenter={() => (interaction ? regionEnter(id) : false)}
			on:mouseleave={() => (interaction ? regionLeave() : false)}
			on:blur={() => (interaction ? regionLeave() : false)}
			class:cursor-pointer={interaction}
		>
			<svelte:component
				this={component}
				fill={interaction ? getStateFillColour(id) : '#fff'}
				class="{interaction ? 'hover:stroke-dark-grey' : ''} {highlight === id
					? 'stroke-dark-grey stroke-2'
					: ''}"
				style="pointer-events: all"
			/>
		</g>
	{/each}
	<!-- <Nsw fill={getStateFillColour('NSW')} stroke="black" strokeWidth={2} />
	<Qld fill={getStateFillColour('QLD')} />
	<Wa fill={getStateFillColour('WA')} />
	<Vic fill={getStateFillColour('VIC')} />
	<Sa fill={getStateFillColour('SA')} />
	<Nt fill="#FFFFFF" /> -->

	<g class="pointer-events-none">
		<TextureMask />
	</g>

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
		<MapLabel text="" colour="#6A6A6A" x={310} y={170} /><!-- NT -->
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
			<g
				role="group"
				use:popperRef
				on:mouseenter={() => flowEnter('NSW1->QLD1', absRound(flows['NSW1->QLD1']))}
				on:mouseleave={flowLeave}
			>
				<Flow
					direction={flows['NSW1->QLD1'] > 0 ? 'up' : 'down'}
					flow={absRound(flows['NSW1->QLD1'])}
					x={500}
					y={315}
				/><!-- QLD <-> NSW -->
			</g>

			<g
				role="group"
				use:popperRef
				on:mouseenter={() => flowEnter('NSW1->VIC1', absRound(flows['NSW1->VIC1']))}
				on:mouseleave={flowLeave}
			>
				<Flow
					direction={flows['NSW1->VIC1'] > 0 ? 'down' : 'up'}
					flow={absRound(flows['NSW1->VIC1'])}
					x={480}
					y={430}
				/><!-- VIC <-> NSW -->
			</g>

			<g
				role="group"
				use:popperRef
				on:mouseenter={() => flowEnter('TAS1->VIC1', absRound(flows['TAS1->VIC1']))}
				on:mouseleave={flowLeave}
			>
				<Flow
					direction={flows['TAS1->VIC1'] > 0 ? 'up' : 'down'}
					flow={absRound(flows['TAS1->VIC1'])}
					x={490}
					y={495}
				/><!-- VIC <-> TAS -->
			</g>

			<g
				role="group"
				use:popperRef
				on:mouseenter={() => flowEnter('SA1->VIC1', absRound(flows['SA1->VIC1']))}
				on:mouseleave={flowLeave}
			>
				<Flow
					direction={flows['SA1->VIC1'] > 0 ? 'right' : 'left'}
					flow={absRound(flows['SA1->VIC1'])}
					x={418}
					y={440}
				/><!-- VIC <-> SA -->
			</g>
		{/if}
	{/if}
</svg>
