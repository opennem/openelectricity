<script>
	import chroma from 'chroma-js';
	import Meta from '$lib/components/Meta.svelte';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import {
		generateUnitShades,
		DEFAULT_SHADE_SPREAD,
		SHADE_SPREADS
	} from '$lib/components/charts/facility/helpers.js';

	// Production values come straight from the source so this page can't drift.
	const PROD_DARKEN = DEFAULT_SHADE_SPREAD.darken;
	const PROD_BRIGHTEN = DEFAULT_SHADE_SPREAD.brighten;
	const PROD_MODE = 'lab';

	/** Unit-level fuel techs (facility units only — no aggregates), grouped by family. */
	const UNIT_FUEL_TECHS = [
		'coal_black',
		'coal_brown',
		'gas_steam',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_wcmg',
		'distillate',
		'bioenergy_biogas',
		'bioenergy_biomass',
		'hydro',
		'pumps',
		'wind',
		'wind_offshore',
		'solar_utility',
		'solar_rooftop',
		'solar_thermal',
		'battery',
		'battery_charging',
		'battery_discharging',
		'nuclear'
	];

	/** Split sizes to preview — most facilities have 2–4 units; a few reach 6–8. */
	const SPLIT_COUNTS = [2, 3, 4, 5, 6, 8];

	const INTERPOLATION_MODES = ['lab', 'lch', 'rgb', 'hsl'];

	let darken = $state(PROD_DARKEN);
	let brighten = $state(PROD_BRIGHTEN);
	let mode = $state(PROD_MODE);

	let isProduction = $derived(
		darken === PROD_DARKEN && brighten === PROD_BRIGHTEN && mode === PROD_MODE
	);

	function reset() {
		darken = PROD_DARKEN;
		brighten = PROD_BRIGHTEN;
		mode = PROD_MODE;
	}

	// Everything except the slider-driven previews is static — compute the
	// production ramps once instead of 100+ chroma scales per slider tick.
	const STATIC_ROWS = UNIT_FUEL_TECHS.map((code) => {
		const base = getFuelTechColour(code);
		const override = SHADE_SPREADS[code];
		return {
			code,
			label: fuelTechNameMap[/** @type {keyof typeof fuelTechNameMap} */ (code)] || code,
			base,
			override,
			production: SPLIT_COUNTS.map((count) => generateUnitShades(base, count, override))
		};
	});

	// Preview via the production formula itself — sliders map 1:1 onto its
	// spread/mode parameters.
	let rows = $derived(
		STATIC_ROWS.map((row) => ({
			...row,
			splits: SPLIT_COUNTS.map((count, i) => ({
				count,
				preview: generateUnitShades(row.base, count, { darken, brighten }, mode),
				production: row.production[i]
			}))
		}))
	);
</script>

<Meta
	title="Fuel Tech Shades"
	description="Preview the fuel tech primary colours and the unit shade splits used on facility charts."
	image="/img/preview.jpg"
/>

<div class="min-h-screen bg-light-warm-grey">
	<header
		class="sticky top-0 z-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-mid-warm-grey/40 bg-white px-6 py-4"
	>
		<div>
			<h1 class="m-0 text-lg font-semibold text-dark-grey">Fuel Tech Shades</h1>
			<p class="m-0 text-xs text-mid-grey">
				How <code>generateUnitShades</code> splits a fuel tech colour across same-tech units
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-dark-grey">
			<label class="flex items-center gap-2">
				<span class="w-14">Darken</span>
				<input type="range" min="0" max="3" step="0.1" bind:value={darken} class="w-36" />
				<span class="w-8 font-mono">{darken.toFixed(1)}</span>
			</label>
			<label class="flex items-center gap-2">
				<span class="w-14">Brighten</span>
				<input type="range" min="0" max="3" step="0.1" bind:value={brighten} class="w-36" />
				<span class="w-8 font-mono">{brighten.toFixed(1)}</span>
			</label>
			<label class="flex items-center gap-2">
				<span>Mode</span>
				<select bind:value={mode} class="rounded border border-mid-warm-grey/60 px-2 py-1">
					{#each INTERPOLATION_MODES as m (m)}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="ml-auto flex items-center gap-3 text-xs">
			{#if isProduction}
				<span class="rounded-full bg-light-warm-grey px-3 py-1 text-mid-grey">
					Showing production values
				</span>
			{:else}
				<span class="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
					Adjusted — production shown underneath for comparison
				</span>
				<button
					type="button"
					class="cursor-pointer rounded-full border border-mid-warm-grey/60 px-3 py-1 text-dark-grey transition-colors hover:bg-light-warm-grey"
					onclick={reset}
				>
					Reset to production ({PROD_DARKEN} / {PROD_BRIGHTEN} / {PROD_MODE})
				</button>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-6 py-8">
		<div class="overflow-x-auto rounded-lg border border-mid-warm-grey/40 bg-white">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-mid-warm-grey/40 text-left text-xs text-mid-grey">
						<th class="px-4 py-3 font-medium">Fuel tech</th>
						<th class="px-4 py-3 font-medium">Base</th>
						{#each SPLIT_COUNTS as count (count)}
							<th class="px-4 py-3 font-medium">{count} units</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-mid-warm-grey/40">
					{#each rows as row (row.code)}
						<tr>
							<td class="px-4 py-3 align-middle">
								<div class="font-medium text-dark-grey">{row.label}</div>
								<div class="font-mono text-xs text-mid-grey">{row.code}</div>
								{#if row.override}
									<span
										class="mt-1 inline-block rounded-full bg-light-warm-grey px-2 py-0.5 text-xxs text-mid-grey"
										title="Sliders don't apply to this fuel tech — it uses its own spread"
									>
										override {row.override.darken} / {row.override.brighten}
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 align-middle">
								<div
									class="h-10 w-14 rounded border border-black/10"
									style="background-color: {row.base};"
									title="{row.code} · {row.base}"
								></div>
								<div class="mt-1 font-mono text-xs text-mid-grey">{row.base}</div>
							</td>
							{#each row.splits as split (split.count)}
								<td class="px-4 py-3 align-middle">
									<div class="flex overflow-hidden rounded border border-black/10">
										{#each split.preview as shade, i (i)}
											<div
												class="h-10 flex-1"
												style="background-color: {shade}; min-width: 14px;"
												title="Unit {i + 1} · {shade}"
											></div>
										{/each}
									</div>
									{#if !isProduction || row.override}
										<div
											class="mt-1 flex overflow-hidden rounded border border-black/10 opacity-90"
											title="Production"
										>
											{#each split.production as shade, i (i)}
												<div
													class="h-3 flex-1"
													style="background-color: {shade}; min-width: 14px;"
													title="Production unit {i + 1} · {shade}"
												></div>
											{/each}
										</div>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="mt-4 text-xs text-mid-grey">
			The split takes the base colour, builds a dark endpoint with
			<code>darken({darken.toFixed(1)})</code>
			and a light endpoint with <code>brighten({brighten.toFixed(1)})</code>, then samples
			<code>{mode}</code>-interpolated steps between them — unit 1 is darkest, the last unit is
			lightest. Fuel techs badged <em>override</em> use their own spread in production (<code
				>SHADE_SPREADS</code
			>) — e.g. coal_black is near-black, so it anchors at the base and spreads upward only; the
			thin strip under their preview always shows the production output. Production formula:
			<code>generateUnitShades</code>
			in
			<code>src/lib/components/charts/facility/helpers.js</code>.
		</p>
	</main>
</div>
