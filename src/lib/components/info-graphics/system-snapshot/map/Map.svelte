<script>
	import { run } from 'svelte/legacy';

	import { createEventDispatcher } from 'svelte';
	import chroma from 'chroma-js';
	import { createIntensityScale, createPriceScale } from '$lib/colours';

	import Flow from './Flow.svelte';
	import MapLabel from './MapLabel.svelte';
	// import TextureMask from './TextureMask.svelte';
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

	let x = $state(0);
	let y = $state(0);
	const mousemove = (ev) => {
		x = ev.clientX;
		y = ev.clientY - 8;
	};

	let getBoundingClientRect = $derived(() => ({
		width: 0,
		height: 0,
		top: y,
		bottom: y,
		left: x,
		right: x
	}));
	const virtualElement = writable({ getBoundingClientRect });
	run(() => {
		$virtualElement = { getBoundingClientRect };
	});
	popperRef(virtualElement);

	let showTooltip = $state(false);

	/**
	 * @typedef {Object} Props
	 * @property {'live' | 'annual'} [mode]
	 * @property {any} [flows]
	 * @property {any} [prices]
	 * @property {any} [intensity]
	 * @property {any} highlight
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		mode = 'live',
		flows = null,
		prices = null,
		intensity = null,
		highlight,
		...rest
	} = $props();

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

	let modeLive = $derived(mode === 'live');

	let tasText = $derived(
		prices && modeLive
			? `${prices.TAS1 ? auDollar.format(prices.TAS1) : '—'}`
			: auNumber.format(intensity.TAS)
	);
	let vicText = $derived(
		prices && modeLive
			? `${prices.VIC1 ? auDollar.format(prices.VIC1) : '—'}`
			: auNumber.format(intensity.VIC)
	);
	let saText = $derived(
		prices && modeLive
			? `${prices.SA1 ? auDollar.format(prices.SA1) : '—'}`
			: auNumber.format(intensity.SA)
	);
	let qldText = $derived(
		prices && modeLive
			? `${prices.QLD1 ? auDollar.format(prices.QLD1) : '—'}`
			: auNumber.format(intensity.QLD)
	);
	let nswText = $derived(
		prices && modeLive
			? `${prices.NSW1 ? auDollar.format(prices.NSW1) : '—'}`
			: auNumber.format(intensity.NSW)
	);
	let waText = $derived(prices && modeLive ? '' : auNumber.format(intensity.WA));

	/**
	 * Get the fill colour for the state based on the map mode and data
	 * @param {string} state
	 * @returns {string}
	 */
	let getStateFillColour = $derived((state) => {
		// if (!data) return '#FFFFFF';

		// const scale = modeLive ? priceColourScale : intensityColourScale;

		// console.log('.prices[state]', prices, prices[state]);

		// console.log('prices', state, prices[`${state}1`], priceColour(prices[`${state}1`]));

		// const iColour = state === 'TAS' ? 0 : intensity[state];

		return modeLive
			? priceColour(prices[`${state}1`]) || '#FFFFFF'
			: $carbonIntensityColour(intensity[state]);
	});

	/**
	 * Get the text colour for a state, making sure it has contrast to the fill colour
	 * @param {string} state
	 */
	let getStateTextColour = $derived((state) => {
		const fill = getStateFillColour(state) || '#FFFFFF';
		return chroma.contrast(fill.toString(), '#FFFFFF') > 4.5 ? '#FFFFFF' : '#000000';
	});

	function regionEnter(region) {
		dispatch('hover', { region });
	}
	function regionLeave() {
		dispatch('hover');
	}

	let flowRegions = $state('');
	let flowValue = $state(0);

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

	// function to check if the value is a number
	const isNumber = (val) => !isNaN(val);
</script>

<svelte:window onmousemove={mousemove} />

{#if showTooltip}
	<div class="hidden md:block" use:popperContent={extraOpts}>
		<CrossBorderExport regions={flowRegions} value={flowValue} />
	</div>
{/if}
<svg
	width="615"
	height="578"
	viewBox="0 0 443 416"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	class={`overflow-visible w-full h-auto block ${rest.class}`}
>
	<!-- State geometry -->
	{#each regions as { id, component, interaction } (id)}
		{@const SvelteComponent = component}
		<g
			role="group"
			onmouseenter={() => (interaction ? regionEnter(id) : false)}
			onmouseleave={() => (interaction ? regionLeave() : false)}
			onblur={() => (interaction ? regionLeave() : false)}
			class:cursor-pointer={interaction}
		>
			<SvelteComponent
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

	<!-- <g class="pointer-events-none">
		<TextureMask />
	</g> -->

	<!-- Vic Arrow -->
	<circle cx="350" cy="329" r="2.5" fill="white" stroke="black" stroke-width="1.5" />
	<path d="M352 330L400 355" stroke="black" stroke-dasharray="3 2" />

	{#if flows && prices && intensity}
		<!-- PRICE/EMISSIONS LABELS -->
		<MapLabel
			text={tasText}
			colour="#000000"
			x={371}
			y={397}
			bg={true}
			textAnchor="left"
		/><!-- Tas -->
		<MapLabel text="" colour="#6A6A6A" x={223} y={122} /><!-- NT -->
		<MapLabel text={saText} colour={getStateTextColour('SA')} x={238} y={238} /><!-- SA -->
		<MapLabel
			text={vicText}
			colour="#000000"
			x={403}
			y={359}
			bg={true}
			textAnchor="left"
		/><!-- VIC -->
		<MapLabel text={waText} colour={getStateTextColour('WA')} x={94} y={189} /><!-- WA -->
		<MapLabel text={qldText} colour={getStateTextColour('QLD')} x={346} y={165} /><!-- QLD -->
		<MapLabel text={nswText} colour={getStateTextColour('NSW')} x={360} y={276} /><!-- NSW -->

		{#if modeLive && flows}
			<!-- FLOWS -->
			<g
				role="group"
				use:popperRef
				onmouseenter={() => flowEnter('NSW1->QLD1', flows['NSW1->QLD1'])}
				onmouseleave={flowLeave}
			>
				<Flow
					direction={flows['NSW1->QLD1'] > 0 ? 'up' : 'down'}
					flow={isNumber(flows['NSW1->QLD1']) ? absRound(flows['NSW1->QLD1']) : '—'}
					x={360}
					y={227}
				/><!-- QLD <-> NSW -->
			</g>

			<g
				role="group"
				use:popperRef
				onmouseenter={() => flowEnter('NSW1->VIC1', flows['NSW1->VIC1'])}
				onmouseleave={flowLeave}
			>
				<Flow
					direction={flows['NSW1->VIC1'] > 0 ? 'down' : 'up'}
					flow={isNumber(flows['NSW1->VIC1']) ? absRound(flows['NSW1->VIC1']) : '—'}
					x={346}
					y={310}
				/><!-- VIC <-> NSW -->
			</g>

			<g
				role="group"
				use:popperRef
				onmouseenter={() => flowEnter('TAS1->VIC1', flows['TAS1->VIC1'])}
				onmouseleave={flowLeave}
			>
				<Flow
					direction={flows['TAS1->VIC1'] > 0 ? 'up' : 'down'}
					flow={isNumber(flows['TAS1->VIC1']) ? absRound(flows['TAS1->VIC1']) : '—'}
					x={353}
					y={356}
				/><!-- VIC <-> TAS -->
			</g>

			<g
				role="group"
				use:popperRef
				onmouseenter={() => flowEnter('SA1->VIC1', flows['SA1->VIC1'])}
				onmouseleave={flowLeave}
			>
				<Flow
					direction={flows['SA1->VIC1'] > 0 ? 'right' : 'left'}
					flow={isNumber(flows['SA1->VIC1']) ? absRound(flows['SA1->VIC1']) : '—'}
					x={301}
					y={317}
				/><!-- VIC <-> SA -->
			</g>
		{/if}
	{/if}
</svg>
