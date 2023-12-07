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

	export let data = {
		TAS: {
			live: {
				price: 57.66
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		},
		NSW: {
			live: {
				price: 57.66
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		},
		QLD: {
			live: {
				price: 57.66
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		},
		WA: {
			live: {
				price: 57.66
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		},
		VIC: {
			live: {
				price: 57.66
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		},
		SA: {
			live: {
				price: 57.66
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		},
		NT: {
			live: {
				price: null
			},
			annual: {
				price: 56.55,
				generation: 18566,
				renewables: 0.45,
				carbon_intensity: 420
			}
		}
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

	<!-- PRICE/EMISSIONS LABELS -->
	<MapLabel
		text={mode === 'live' ? `$${data.TAS.live.price}` : data.TAS.annual.carbon_intensity}
		colour="#000000"
		x={515}
		y={552}
		bg={true}
		textAnchor="left"
	/><!-- Tas -->
	<MapLabel text="N/A" colour="#6A6A6A" x={310} y={170} /><!-- NT -->
	<MapLabel
		text={mode === 'live' ? `$${data.SA.live.price}` : data.SA.annual.carbon_intensity}
		colour={best('#ffffff', '#000000', '#ff000088')}
		x={330}
		y={330}
	/><!-- SA -->
	<MapLabel
		text={mode === 'live' ? `$${data.VIC.live.price}` : data.VIC.annual.carbon_intensity}
		colour="#000000"
		x={560}
		y={498}
		bg={true}
		textAnchor="left"
	/><!-- VIC -->
	<MapLabel
		text={mode === 'live' ? `$${data.WA.live.price}` : data.WA.annual.carbon_intensity}
		colour={best('#ffffff', '#000000', '#ff000088')}
		x={130}
		y={263}
	/><!-- WA -->
	<MapLabel
		text={mode === 'live' ? `$${data.QLD.live.price}` : data.QLD.annual.carbon_intensity}
		colour={best('#ffffff', '#000000', '#ff000088')}
		x={480}
		y={229}
	/><!-- QLD -->
	<MapLabel
		text={mode === 'live' ? `$${data.NSW.live.price}` : data.NSW.annual.carbon_intensity}
		colour={best('#ffffff', '#000000', '#ff000088')}
		x={500}
		y={383}
	/><!-- NSW -->

	{#if mode === 'live'}
		<!-- FLOWS -->
		<Flow direction="down" flow={999} x={500} y={315} /><!-- QLD <-> NSW -->
		<Flow direction="up" flow={342} x={480} y={430} /><!-- VIC <-> NSW -->
		<Flow direction="down" flow={365} x={490} y={495} /><!-- VIC <-> TAS -->
		<Flow direction="left" flow={342} x={418} y={440} /><!-- VIC <-> SA -->
	{/if}
</svg>
