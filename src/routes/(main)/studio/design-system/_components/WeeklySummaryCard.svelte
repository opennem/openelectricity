<script>
	/**
	 * WeeklySummaryCard — a composed specimen for the design-system page: the
	 * weekly energy summary social/report card in NEM and WEM variants. Fixed
	 * demo figures; colours resolve through the canonical fuel-tech map. The
	 * Australia glyph is the real state map geometry, simplified for card size.
	 */

	import { fuelTechColourMap } from '$lib/theme/openelectricity.js';
	import { getNumberFormat } from '$lib/utils/formatters';

	/**
	 * @typedef {Object} Props
	 * @property {'NEM' | 'WEM'} [network]
	 */

	/** @type {Props} */
	let { network = 'NEM' } = $props();

	const DARK = '#353535';
	const LIGHT = '#C6C6C6';
	const STATE_STROKE = '#FAF9F6';

	const inNem = $derived(network === 'NEM');
	// Fill for states in / out of the card's market — one place to retune the scheme.
	const memberFill = $derived(inNem ? DARK : LIGHT);
	const nonMemberFill = $derived(inNem ? LIGHT : DARK);

	const stats = [
		{ label: 'Generation', value: '3,588', unit: 'GWh', change: '5.4%', up: true },
		{ label: 'Renewables', value: '45.6%', unit: '', change: '5.4%', up: true },
		{ label: 'Avg. Price', value: '$44', unit: '/MWh', change: '5.4%', up: false }
	];

	const rows = [
		{ code: 'solar', label: 'Solar', energy: 725, share: 20.2, change: '22%', up: false },
		{ code: 'wind', label: 'Wind', energy: 320, share: 8.9, change: '42%', up: false },
		{ code: 'hydro', label: 'Hydro', energy: 259, share: 7.2, change: '42%', up: true },
		{
			code: 'battery_discharging',
			label: 'Battery Discharge',
			energy: 53,
			share: 1.5,
			change: '2%',
			up: false
		},
		{ code: 'gas', label: 'Gas', energy: 165, share: 4.6, change: '73%', up: true },
		{ code: 'coal', label: 'Coal', energy: 2060, share: 57.4, change: '12%', up: true }
	];

	const energyFormat = getNumberFormat(0);
	/** @param {string} code */
	const ftColour = (code) => /** @type {Record<string, string>} */ (fuelTechColourMap)[code];
</script>

<div class="bg-light-warm-grey rounded-xl p-10 flex flex-col gap-8">
	<!-- Header -->
	<div class="flex items-start justify-between gap-8">
		<div>
			<h3 class="text-xl leading-xl font-semibold m-0">{network} weekly energy summary</h3>
			<p class="text-sm text-mid-grey m-0 mt-1">24 Feb – 2 March, 2026</p>
		</div>
		<!-- Simplified Australia glyph: the real per-state map paths
		     (system-snapshot/map/states) reduced with Douglas-Peucker so the
		     silhouette stays true but the coastline detail drops away at card
		     size. NT stays light in both variants — it's in neither market. -->
		<svg viewBox="0 0 443 416" class="w-24 shrink-0" aria-label="{network} regions highlighted">
			<g stroke={STATE_STROKE} stroke-width="6" stroke-linejoin="round">
				<path
					d="M175 53L175 251L112 281L34 292L23 284L31 252L4 184L11 133L88 106L109 70L116 67L130 70L143 42L158 42L164 60Z"
					fill={nonMemberFill}
				/>
				<path
					d="M207 11L262 25L244 51L273 71L273 181L175 181L175 53L183 56L192 25L216 22Z"
					fill={LIGHT}
				/>
				<path
					d="M175 181L305 181L305 335L287 299L274 302L274 283L260 297L270 262L250 294L226 257L175 251Z"
					fill={memberFill}
				/>
				<path
					d="M418 220L305 218L305 181L273 181L273 71L303 82L321 7L335 48L352 53L363 98L390 113L399 140L410 138L434 173L441 207Z"
					fill={memberFill}
				/>
				<path d="M305 218L418 220L442 208L403 328L380 307L346 309L305 281Z" fill={memberFill} />
				<path
					d="M305 281L346 309L380 307L403 328L364 350L348 333L333 346L311 340Z"
					fill={memberFill}
				/>
				<path d="M346 373L384 374L381 409L360 413Z" fill={memberFill} />
			</g>
		</svg>
	</div>

	<!-- Stat tiles -->
	<div class="grid grid-cols-3 gap-4">
		{#each stats as stat (stat.label)}
			<div class="bg-white border border-warm-grey rounded-lg px-6 py-5">
				<p class="text-sm m-0">{stat.label}</p>
				<p class="font-mono font-medium text-lg leading-lg tabular-nums m-0 mt-2">
					{stat.value}<span class="text-xs text-mid-grey font-normal">&nbsp;{stat.unit}</span>
				</p>
				<p
					class="font-mono text-xs tabular-nums m-0"
					class:text-success-green={stat.up}
					class:text-error-red={!stat.up}
				>
					{stat.change}<span class="ml-2">{stat.up ? '▲' : '▼'}</span>
				</p>
			</div>
		{/each}
	</div>

	<!-- Fuel tech rows -->
	<div
		class="bg-white rounded-lg border border-warm-grey divide-y divide-warm-grey overflow-hidden"
	>
		{#each rows as row (row.code)}
			<div class="flex items-stretch h-14">
				<!-- The bar underlays the label area, so a 100% bar spans the full
				     stretch up to the numbers boundary; the right-aligned label rides
				     over it with a translucent bg to stay legible. -->
				<div class="flex-1 relative min-w-0">
					<div
						class="absolute inset-y-0 left-0"
						style:width="{row.share}%"
						style:background-color={ftColour(row.code)}
					></div>
					<div class="relative z-10 h-full flex items-center justify-end pl-6 pr-2">
						<span class="text-sm font-medium whitespace-nowrap bg-white/70 rounded-sm px-1"
							>{row.label}</span
						>
					</div>
				</div>
				<div class="flex items-center pl-2 shrink-0">
					<span
						class="w-2.5 h-2.5 rounded-full shrink-0"
						style:background-color={ftColour(row.code)}
					></span>
				</div>
				<div class="w-36 flex items-center justify-end px-4 shrink-0">
					<span class="font-mono text-sm tabular-nums"
						>{energyFormat.format(row.energy)}<span class="text-xs text-mid-grey">&nbsp;GWh</span
						></span
					>
				</div>
				<div class="w-24 flex items-center justify-end shrink-0">
					<span class="font-mono text-sm tabular-nums">{row.share}%</span>
				</div>
				<div class="w-32 flex items-center justify-end pr-6 shrink-0">
					<span
						class="font-mono text-sm tabular-nums"
						class:text-success-green={row.up}
						class:text-error-red={!row.up}
					>
						{row.change}<span class="ml-2">{row.up ? '▲' : '▼'}</span>
					</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Footer -->
	<div class="flex items-center justify-between gap-8 mt-6">
		<p class="text-xs text-mid-grey m-0">Source: Open Electricity, TSI</p>
		<img class="block h-8" src="/img/logo.svg" alt="Open Electricity" />
	</div>
</div>
