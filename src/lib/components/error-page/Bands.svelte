<script>
	import { fuelTechColourMap } from '$lib/theme/openelectricity';

	// Top → bottom, mirroring the site's stacked-area order (solar on top,
	// coal at the base). Bands are equal height.
	/** @type {import('$lib/types/fuel_tech.types').FuelTechCode[]} */
	const stack = [
		'solar_rooftop',
		'solar_utility',
		'wind',
		'hydro',
		'battery_discharging',
		'gas',
		'coal_black'
	];
</script>

<!-- The 404 digits filled with a stacked generation-mix gradient, like the
     site's stacked area charts. -->
<svg viewBox="0 0 420 160" class="w-full h-auto max-w-2xl mx-auto" aria-hidden="true">
	<defs>
		<!-- userSpaceOnUse pins the bands to the digits' visible extent (cap top
		     ~y=35 to baseline y=140) — the default objectBoundingBox spans the
		     font's full ascent/descent, which pushes the top bands off the glyphs. -->
		<linearGradient
			id="notfound-fueltech-bands"
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="35"
			x2="0"
			y2="140"
		>
			{#each stack as code, i (code)}
				<stop offset={i / stack.length} stop-color={fuelTechColourMap[code]} />
				<stop offset={(i + 1) / stack.length} stop-color={fuelTechColourMap[code]} />
			{/each}
		</linearGradient>
	</defs>
	<text
		x="210"
		y="140"
		text-anchor="middle"
		class="font-space"
		font-size="150"
		font-weight="700"
		letter-spacing="-3"
		fill="url(#notfound-fueltech-bands)"
	>
		404
	</text>
</svg>
