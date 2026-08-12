<script>
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import LogoMark from '$lib/images/logo-mark.svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity.js';
	import { statusOptions } from '$lib/facilities/filters.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import secondaryColours from '$lib/theme/secondary-colour-palette.js';
	import { regionOptions } from '$lib/regions.js';
	import { spectrum, getContrastedTextCss } from '$lib/colours.js';
	import { MAP_FAB_CLASS } from '$lib/components/map/map-style.js';
	import Button from '$lib/components/form-elements/Button.svelte';
	import Button2 from '$lib/components/form-elements/Button2.svelte';
	import Toggle from '$lib/components/form-elements/Toggle.svelte';
	import CheckboxNew from '$lib/components/form-elements/CheckboxNew.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import { Button as ShadButton } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import simpleGroup from '$lib/fuel-tech-groups/simple.js';
	import rvfGroup from '$lib/fuel-tech-groups/renewables-fossils.js';
	import sourcesLoadsGroup from '$lib/fuel-tech-groups/sources-loads.js';
	import vreResidualGroup from '$lib/fuel-tech-groups/lens/vre-residual.js';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';
	import IconShare from '$lib/icons/Share.svelte';
	import IconArrowDownTray from '$lib/icons/ArrowDownTray.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';
	import IconGithub from '$lib/icons/Github.svelte';
	import ChartStyles from '$lib/components/charts/v2/ChartStyles.svelte.js';
	import { SERIES_FALLBACK_COLOUR } from '$lib/components/charts/colours.js';
	import SwatchGrid from './_components/SwatchGrid.svelte';
	import DemoChart from './_components/DemoChart.svelte';
	import WeeklySummaryCard from './_components/WeeklySummaryCard.svelte';
	import ResizeStage from './_components/ResizeStage.svelte';

	// Shared specimen-stage surface — referenced by every component stage below.
	const STAGE = 'bg-light-warm-grey border border-warm-grey rounded-lg p-10';

	const REPO = 'https://github.com/opennem/openelectricity/blob/main/';
	const REPO_TREE = 'https://github.com/opennem/openelectricity/tree/main/';

	// Fuel-tech badges as /facilities presents them: coloured chip, white glyph,
	// flipping to black on the light backgrounds via needsDarkText().
	// Every fueltech with a *Sm glyph (29), in detailed-palette order.
	const ftBadgeSpecimens = [
		'solar_utility',
		'solar_rooftop',
		'solar',
		'wind',
		'wind_offshore',
		'hydro',
		'pumps',
		'battery',
		'battery_discharging',
		'battery_charging',
		'bioenergy',
		'bioenergy_biomass',
		'bioenergy_biogas',
		'coal',
		'coal_black',
		'coal_brown',
		'gas',
		'gas_steam',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_wcmg',
		'gas_hydrogen',
		'distillate',
		'demand',
		'data_centre',
		'renewables',
		'fossils'
	];
	const uiIconSpecimens = [
		{ name: 'ChevronDown', component: IconChevronDown },
		{ name: 'XMark', component: IconXMark },
		{ name: 'Share', component: IconShare },
		{ name: 'ArrowDownTray', component: IconArrowDownTray },
		{ name: 'AdjustmentsHorizontal', component: IconAdjustmentsHorizontal },
		{ name: 'Github', component: IconGithub }
	];

	// The warm-neutral ramp and accents are defined in tailwind.config.js
	// (theme.colors — it replaces the default Tailwind palette).
	const neutrals = [
		{ name: 'white', hex: '#FFFFFF', note: 'page background' },
		{ name: 'light-warm-grey', hex: '#FAF9F6', note: 'off-white surface' },
		{ name: 'warm-grey', hex: '#F1F0ED', note: 'subtle fills, dividers' },
		{ name: 'mid-warm-grey', hex: '#C6C6C6', note: 'borders, axis text' },
		{ name: 'mid-grey', hex: '#6A6A6A', note: 'muted text, labels' },
		{ name: 'dark-grey', hex: '#353535', note: 'body text, dark surfaces' },
		{ name: 'black', hex: '#000000', note: 'button fills, banner' }
	];
	const accents = [
		{ name: 'red', hex: '#C74523', note: 'primary accent — links, focus' },
		{ name: 'dark-red', hex: '#963F29', note: 'link hover, brush handles' },
		{ name: 'success-green', hex: '#70D26E', note: 'success' },
		{ name: 'error-red', hex: '#FA6060', note: 'errors' },
		{ name: 'alert-yellow', hex: '#EB1F70', note: 'alerts (actually magenta)' }
	];

	const regions = regionOptions.map((region) => ({
		name: region.shortLabel,
		hex: region.colour,
		note: region.description
	}));
	// Only show the secondary colours the region palette doesn't already cover.
	const secondary = secondaryColours
		.map((hex, i) => ({ name: `secondary ${i + 1}`, hex }))
		.filter((item) => !regions.some((r) => r.hex.toLowerCase() === item.hex.toLowerCase()));

	/** @type {Record<string, string>} */
	const extraLabels = { vre: 'VRE (Wind + Solar)', residual: 'Residual', demand: 'Demand' };
	/** @param {string} code */
	const ftLabel = (code) =>
		/** @type {Record<string, string>} */ (fuelTechNameMap)[code] ?? extraLabels[code] ?? code;
	/**
	 * @param {string[]} codes
	 * @param {Record<string, string>} [labels] - per-scheme label overrides
	 */
	const ftItems = (codes, labels = {}) =>
		codes.map((code) => ({
			name: labels[code] ?? ftLabel(code),
			hex: /** @type {Record<string, string>} */ (fuelTechColourMap)[code],
			note: code
		}));

	const ftDetailed = ftItems([
		'solar_utility',
		'solar_rooftop',
		'solar_thermal',
		'wind',
		'wind_offshore',
		'hydro',
		'pumps',
		'battery_discharging',
		'battery_charging',
		'bioenergy_biomass',
		'bioenergy_biogas',
		'coal_black',
		'coal_brown',
		'gas_steam',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_wcmg',
		'gas_hydrogen',
		'distillate',
		'nuclear',
		'imports',
		'exports',
		'interconnector',
		'demand',
		'demand_response',
		'data_centre',
		'vre',
		'residual'
	]);
	const ftGroups = ftItems([
		'coal',
		'gas',
		'bioenergy',
		'solar',
		'renewables',
		'fossils',
		'demand',
		'total_sources',
		'total_loads'
	]);

	// The real grouping schemes, rendered from their own modules — each lists
	// its groups in stack order and resolves colours through the canonical map.
	const groupSchemes = [simpleGroup, rvfGroup, vreResidualGroup, sourcesLoadsGroup].map(
		(scheme) => ({
			label: scheme.label,
			value: scheme.value,
			items: ftItems(scheme.order, scheme.labels)
		})
	);

	// Live chart tokens — read off a real ChartStyles instance so the table
	// cannot drift from the values the charts actually use.
	const chartStyles = new ChartStyles();

	const statuses = statusOptions.map(({ label, colour }) => ({ name: label, hex: colour }));

	// Literal class names so Tailwind's scanner picks them up.
	const typeScale = [
		{ cls: 'text-xxxs', label: 'xxxs · 8px' },
		{ cls: 'text-xxs', label: 'xxs · 10px' },
		{ cls: 'text-xs leading-xs', label: 'xs · 12/16px' },
		{ cls: 'text-sm leading-sm', label: 'sm · 14/18px' },
		{ cls: 'text-base leading-base', label: 'base · 16/20px' },
		{ cls: 'text-lg leading-lg', label: 'lg · 20/24px' },
		{ cls: 'text-xl leading-xl', label: 'xl · 24/28px' },
		{ cls: 'text-2xl leading-2xl', label: '2xl · 28/32px' },
		{ cls: 'text-3xl leading-3xl', label: '3xl · 36/40px' },
		{ cls: 'text-4xl leading-4xl', label: '4xl · 40/44px' },
		{ cls: 'text-6xl leading-6xl', label: '6xl · 48/52px' },
		{ cls: 'text-9xl leading-9xl', label: '9xl · 60/64px' }
	];

	const sources = [
		{ what: 'Colour palette, type scale, breakpoints', path: 'tailwind.config.js' },
		{ what: 'Base styles, fonts, shadcn variables, named text styles', path: 'src/app.css' },
		{
			what: 'Canonical fuel-tech, status and carbon colours',
			path: 'src/lib/theme/openelectricity.js'
		},
		{ what: 'Fuel-tech display names', path: 'src/lib/fuel_techs.js' },
		{ what: 'Grouping schemes', path: 'src/lib/fuel-tech-groups/' },
		{ what: 'Secondary categorical palette', path: 'src/lib/theme/secondary-colour-palette.js' },
		{ what: 'Region colours', path: 'src/lib/regions.js' },
		{ what: 'Sequential scales (emissions, price)', path: 'src/lib/colours.js' },
		{ what: 'House form controls', path: 'src/lib/components/form-elements/' },
		{ what: 'shadcn primitives', path: 'src/lib/components/ui/' },
		{ what: 'Stratum chart tokens', path: 'src/lib/components/charts/v2/ChartStyles.svelte.js' },
		{
			what: 'Observable Plot themes',
			path: 'src/lib/components/charts/plot/PlotChartTheme.svelte.js'
		},
		{ what: 'Icons (UI + fuel-tech glyphs)', path: 'src/lib/icons/' },
		{ what: 'Logo mark (animated)', path: 'src/lib/images/logo-mark.svelte' },
		{ what: 'Wordmark SVG', path: 'static/img/logo.svg' },
		{ what: 'Self-hosted fonts', path: 'static/fonts/' }
	];

	const sectionLinks = [
		{ id: 'colour', label: 'Colour' },
		{ id: 'fuel-techs', label: 'Fuel techs' },
		{ id: 'typography', label: 'Type' },
		{ id: 'layout', label: 'Layout' },
		{ id: 'components', label: 'Components' },
		{ id: 'charts', label: 'Charts' },
		{ id: 'compositions', label: 'Compositions' },
		{ id: 'brand', label: 'Brand' },
		{ id: 'sources', label: 'Sources' }
	];

	let activeSection = $state('');
	let ogPreviewWidth = $state(0);

	const OG_RECORD_ID = 'au.nem.battery_discharging.power.interval.high';
	const OG_FOCUS_TIME = '1786436100000';

	// Scrollspy: a section is active while it spans the band just below the
	// sticky nav (10–30% of the viewport height from the top).
	$effect(() => {
		const sections = sectionLinks
			.map((link) => document.getElementById(link.id))
			.filter((el) => el !== null);
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeSection = entry.target.id;
				}
			},
			{ rootMargin: '-10% 0px -70% 0px' }
		);
		sections.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});
</script>

<Meta
	title="Design System"
	description="The visual language of Open Electricity — colours, typography, components and chart styling, rendered from the live code."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	{#snippet heading()}
		<div class="flex flex-col items-center gap-6">
			<LogoMark classes="w-16 h-10" />
			<h1 class="tracking-widest text-center">Design System</h1>
		</div>
	{/snippet}
	{#snippet subheading()}
		<div>
			<p class="text-sm text-center w-full md:w-[800px] mx-auto">
				The visual language of Open Electricity, rendered from the live code — every swatch, type
				style and component on this page is imported from the same source the site itself uses, with
				links into the
				<a href="https://github.com/opennem/openelectricity">public repo</a> for each section.
			</p>
		</div>
	{/snippet}
</PageHeaderSimple>

<nav
	class="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-warm-grey"
	aria-label="Page sections"
>
	<div class="container flex gap-2 overflow-x-auto py-4">
		{#each sectionLinks as link (link.id)}
			<a
				href="#{link.id}"
				class="font-space text-xxs font-medium uppercase tracking-wider whitespace-nowrap rounded-full px-6 py-2 hover:no-underline {activeSection ===
				link.id
					? 'bg-dark-grey text-white'
					: 'text-mid-grey hover:bg-warm-grey hover:text-dark-grey'}"
			>
				{link.label}
			</a>
		{/each}
	</div>
</nav>

{#snippet sectionHead(
	/** @type {string} */ kicker,
	/** @type {string} */ title,
	/** @type {string} */ srcLabel,
	/** @type {string} */ srcHref
)}
	<div
		class="border-t-2 border-dark-grey pt-6 mb-8 flex flex-wrap items-baseline justify-between gap-4"
	>
		<div>
			<p class="font-space font-medium tracking-wider text-sm leading-sm uppercase text-red mb-2">
				{kicker}
			</p>
			<h2 class="font-space mb-0">{title}</h2>
		</div>
		<a
			href={srcHref}
			class="font-mono text-xs text-mid-grey border border-warm-grey bg-light-warm-grey rounded-full px-6 py-2 hover:text-red hover:no-underline"
		>
			{srcLabel}
		</a>
	</div>
{/snippet}

<div class="container py-12 flex flex-col gap-24">
	<!-- Read this first -->
	<div class="border-l-4 border-red bg-light-warm-grey rounded-r-lg px-8 py-6 text-sm max-w-4xl">
		<strong class="font-space">Read this first.</strong> The app sets
		<code>html &#123; font-size: 62.5% &#125;</code>, so <strong>1rem = 10px</strong> everywhere —
		every Tailwind rem utility renders ~1.6× smaller than stock (<code>text-base</code> is 16px,
		<code>p-4</code> is 10px, <code>rounded-lg</code> ≈ 6px). When recreating layouts in a design
		tool, work on a 5px base grid. The site-wide mobile↔desktop boundary is
		<code>md:</code> = <strong>1024px</strong>, not Tailwind's usual 768px.
	</div>

	<!-- Colour -->
	<section id="colour" class="scroll-mt-24">
		{@render sectionHead(
			'01 · Foundations',
			'Colour',
			'tailwind.config.js',
			`${REPO}tailwind.config.js`
		)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			The palette is warm-neutral — no cool blue-greys anywhere in the chrome. Greys carry a slight
			warm cast, one brick-red accent does all interactive signalling, and every other colour comes
			from the fuel-technology data palette. The custom palette replaces Tailwind's defaults
			entirely.
		</p>

		<h3 class="subhead-primary mb-4">Neutrals — the warm ramp</h3>
		<SwatchGrid items={neutrals} />

		<h3 class="subhead-primary mt-12 mb-4">Accent &amp; semantic</h3>
		<SwatchGrid items={accents} />

		<h3 class="subhead-primary mt-12 mb-4">Categorical &amp; regions</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-4">
			The secondary palette serves non-fuel-tech series; region colours reuse it, with NEM as a
			whole getting its own red.
		</p>
		<SwatchGrid items={[...regions, ...secondary]} />

		<h3 class="subhead-primary mt-12 mb-4">Sequential scales</h3>
		<div class="max-w-3xl">
			<div
				class="h-8 rounded-md border border-warm-grey"
				style:background="linear-gradient(90deg, {spectrum.intensity.join(', ')})"
			></div>
			<div class="flex justify-between font-mono text-xxs text-mid-grey mt-1 mb-6">
				<span>{spectrum.intensity[0]} · low emissions intensity</span>
				<span>{spectrum.intensity[spectrum.intensity.length - 1]} · high</span>
			</div>
			<div class="flex rounded-md overflow-hidden border border-warm-grey h-8">
				{#each spectrum.price as hex (hex)}
					<div class="flex-1" style:background-color={hex}></div>
				{/each}
			</div>
			<div class="flex justify-between font-mono text-xxs text-mid-grey mt-1">
				<span>{spectrum.price[0]} · low price</span>
				<span>{spectrum.price[spectrum.price.length - 1]} · high</span>
			</div>
		</div>

		<div
			class="border-l-4 border-red bg-light-warm-grey rounded-r-lg px-8 py-6 text-sm max-w-4xl mt-10"
		>
			<strong class="font-space">A second colour system coexists.</strong> The shadcn-svelte
			components (<code>ui/button</code>, <code>ui/card</code>) use their own cool-neutral oklch
			variable layer defined in <code>src/app.css</code> — a shadcn "default" button renders near-black,
			not brand red. Its dark-mode variables exist but are unused: the product UI is light-only.
		</div>
	</section>

	<!-- Fuel techs -->
	<section id="fuel-techs" class="scroll-mt-24">
		{@render sectionHead(
			'02 · Data palette',
			'Fuel technology colours',
			'src/lib/theme/openelectricity.js',
			`${REPO}src/lib/theme/openelectricity.js`
		)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			The heart of the visual identity — each technology has a fixed colour used in every chart, map
			and legend. The canonical map is <code>$lib/theme/openelectricity.js</code>; the older
			palettes still in the repo (<code>theme/opennem.js</code>,
			<code>theme/openelectricity-old.js</code> and the stale copy inside
			<code>fuel_techs.js</code>) should not be used.
		</p>

		<h3 class="subhead-primary mb-4">Detailed palette</h3>
		<SwatchGrid items={ftDetailed} />

		<h3 class="subhead-primary mt-12 mb-4">Group palette</h3>
		<SwatchGrid items={ftGroups} />

		<h3 class="subhead-primary mt-12 mb-4">Grouping schemes</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-6">
			Each view mode groups the detailed fueltechs differently — these are the live scheme
			definitions from <code>src/lib/fuel-tech-groups/</code>, listed in stack order (bottom of the
			chart first). Detailed and split-solar variants, plus scenario- and facility-specific schemes,
			live in the same directory.
		</p>
		{#each groupSchemes as scheme (scheme.value)}
			<div class="mb-8">
				<p class="font-space uppercase text-xxs text-mid-grey mb-3">
					{scheme.label} · <code>{scheme.value}</code>
				</p>
				<SwatchGrid items={scheme.items} />
			</div>
		{/each}

		<div
			class="border-l-4 border-red bg-light-warm-grey rounded-r-lg px-8 py-6 text-sm max-w-4xl mt-10"
		>
			<strong class="font-space">Stack order matters.</strong> Stacked charts build bottom→top: loads
			first (battery charging, pumps, exports), then imports, coal (brown → black), bioenergy, distillate,
			the gas family, batteries discharging, hydro, wind, and solar on top — solar always crowns the stack.
		</div>
	</section>

	<!-- Typography -->
	<section id="typography" class="scroll-mt-24">
		{@render sectionHead('03 · Foundations', 'Typography', 'src/app.css', `${REPO}src/app.css`)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			Three faces with strict roles, all self-hosted variable fonts in <code>static/fonts/</code>.
		</p>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
			<div class="border border-warm-grey rounded-lg p-8">
				<p class="font-space font-medium tracking-wider text-sm leading-sm uppercase text-red mb-4">
					Body · font-sans
				</p>
				<p class="text-xl leading-xl mb-4">DM Sans — prose &amp; running text</p>
				<p class="text-xs text-mid-grey">
					Weights: 300 light (metadata) · 400 · 500 · 600 semibold (headings) · 700
				</p>
			</div>
			<div class="border border-warm-grey rounded-lg p-8">
				<p class="font-space font-medium tracking-wider text-sm leading-sm uppercase text-red mb-4">
					UI voice · font-space
				</p>
				<p class="font-space text-xl leading-xl mb-4">Space Grotesk — labels, buttons, eyebrows</p>
				<p class="text-xs text-mid-grey">
					Almost always <span class="font-space uppercase tracking-widest"
						>uppercase + wide tracking</span
					>
					at small sizes. Weights: 400 · 500 · 600 · 700
				</p>
			</div>
			<div class="border border-warm-grey rounded-lg p-8">
				<p class="font-space font-medium tracking-wider text-sm leading-sm uppercase text-red mb-4">
					Data · font-mono
				</p>
				<p class="font-mono text-xl leading-xl mb-4">DM Mono — 1,234.5 MW</p>
				<p class="text-xs text-mid-grey">
					Numerics and values, always with <code>tabular-nums</code>. Weights: 400 · 500
				</p>
			</div>
		</div>

		<h3 class="subhead-primary mb-4">Type scale</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-4">
			Effective px on the 10px root; line heights pair 1:1 with each size token and always add 4px.
			Convention: always write <code>text-X leading-X</code> together.
		</p>
		<div class="border border-warm-grey rounded-lg divide-y divide-warm-grey overflow-x-auto">
			{#each typeScale as size (size.cls)}
				<div class="flex items-baseline gap-8 px-6 py-3">
					<span class="font-mono text-xs text-mid-grey w-44 shrink-0">{size.label}</span>
					<span class="{size.cls} whitespace-nowrap">Electricity demand fell 4.2% year on year</span
					>
				</div>
			{/each}
		</div>

		<h3 class="subhead-primary mt-12 mb-4">Heading defaults</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-4">
			All headings are semibold (600) with <code>mb-[0.5em]</code>, except h6 at medium (500). Body
			text is 16px <code>#353535</code>; paragraphs get <code>mb-[1em]</code>.
		</p>
		<div class="overflow-x-auto">
			<table class="w-full text-sm border border-warm-grey rounded-lg">
				<tbody class="divide-y divide-warm-grey">
					<tr
						><td class="font-mono px-6 py-3">h1</td><td class="font-mono px-6 py-3">40 / 44px</td
						><td class="font-mono px-6 py-3">60 / 64px ≥ 1024px</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">h2</td><td class="font-mono px-6 py-3">28 / 32px</td
						><td class="font-mono px-6 py-3">36 / 40px ≥ 1024px</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">h3</td><td class="font-mono px-6 py-3">24 / 28px</td
						><td class="px-6 py-3 text-mid-grey">—</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">h4</td><td class="font-mono px-6 py-3">16 / 20px</td
						><td class="font-mono px-6 py-3">20 / 24px ≥ 1024px</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">h5</td><td class="font-mono px-6 py-3">16 / 20px</td
						><td class="px-6 py-3 text-mid-grey">—</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">h6</td><td class="font-mono px-6 py-3"
							>14 / 18px · 500</td
						><td class="px-6 py-3 text-mid-grey">—</td></tr
					>
				</tbody>
			</table>
		</div>

		<h3 class="subhead-primary mt-12 mb-4">Letter spacing</h3>
		<div class="overflow-x-auto">
			<table class="w-full text-sm border border-warm-grey rounded-lg">
				<tbody class="divide-y divide-warm-grey">
					<tr
						><td class="font-mono px-6 py-3">tightest / tighter / tight</td><td
							class="font-mono px-6 py-3">-1.2 / -0.72 / -0.48px</td
						><td class="px-6 py-3 text-mid-grey">large display headings</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">wider</td><td class="font-mono px-6 py-3">0.63px</td
						><td class="px-6 py-3 text-mid-grey">.subhead-secondary, large links</td></tr
					>
					<tr
						><td class="font-mono px-6 py-3">widest</td><td class="font-mono px-6 py-3">1.5px</td
						><td class="px-6 py-3 text-mid-grey">.subhead-primary, uppercase eyebrows</td></tr
					>
				</tbody>
			</table>
		</div>

		<h3 class="subhead-primary mt-12 mb-4">Named text styles</h3>
		<div class="border border-warm-grey rounded-lg divide-y divide-warm-grey">
			<div class="flex flex-wrap items-center gap-x-12 gap-y-2 px-6 py-4">
				<span class="font-mono text-xs text-mid-grey w-52 shrink-0">.subhead-primary</span>
				<span class="subhead-primary">Grid snapshot</span>
			</div>
			<div class="flex flex-wrap items-center gap-x-12 gap-y-2 px-6 py-4">
				<span class="font-mono text-xs text-mid-grey w-52 shrink-0">.subhead-secondary</span>
				<span class="subhead-secondary">All regions · Last 7 days</span>
			</div>
			<div class="flex flex-wrap items-center gap-x-12 gap-y-2 px-6 py-4">
				<span class="font-mono text-xs text-mid-grey w-52 shrink-0">.text-link-large</span>
				<span class="text-link-large">View the full analysis</span>
			</div>
			<div class="flex flex-wrap items-center gap-x-12 gap-y-2 px-6 py-4">
				<span class="font-mono text-xs text-mid-grey w-52 shrink-0">chart title (h6)</span>
				<span class="font-space uppercase text-xs font-normal">Generation by fuel type</span>
			</div>
			<div class="flex flex-wrap items-center gap-x-12 gap-y-2 px-6 py-4">
				<span class="font-mono text-xs text-mid-grey w-52 shrink-0">control eyebrow</span>
				<span class="font-space uppercase text-xxs text-mid-grey">Display options</span>
			</div>
		</div>

		<h3 class="subhead-primary mt-12 mb-4">Writing &amp; formatting conventions</h3>
		<ul class="text-sm max-w-3xl flex flex-col gap-3 list-disc list-outside ml-8">
			<li>
				<strong>UK/AU spelling</strong> throughout — colour, centre, organisation — and
				<strong>en-AU</strong> <code>Intl</code> formatting for all dates and numbers: "16 June 2025",
				"6:30 am", comma-grouped thousands. Short month names render as June / July / Sept.
			</li>
			<li>
				<strong>Values are always DM Mono</strong> with <code>tabular-nums</code>; the unit (<span
					class="font-mono">MW</span
				>, <span class="font-mono">GWh</span>,
				<span class="font-mono">$/MWh</span>) follows in a smaller, mid-grey suffix.
			</li>
			<li>
				<strong>Sentence case</strong> for headings and prose. Space Grotesk UI labels (eyebrows, chart
				titles, group headings) are uppercase with wide tracking.
			</li>
			<li>
				<strong>Trends and status</strong>: success-green ▲ for up, error-red ▼ for down; facility
				statuses use the dedicated status palette.
			</li>
			<li>
				<strong>Interaction</strong>: links are brick red with hover underline; focus rings are red
				(<code>focus:ring-red</code>); transitions run 150–500ms ease. Chart hover paints the red
				focus line and dot.
			</li>
		</ul>
	</section>

	<!-- Layout -->
	<section id="layout" class="scroll-mt-24">
		{@render sectionHead(
			'04 · Foundations',
			'Layout, space & surfaces',
			'tailwind.config.js',
			`${REPO}tailwind.config.js`
		)}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<div>
				<h3 class="subhead-primary mb-4">Breakpoints</h3>
				<table class="w-full text-sm border border-warm-grey rounded-lg">
					<tbody class="divide-y divide-warm-grey">
						<tr
							><td class="font-mono px-6 py-3">sm</td><td class="font-mono px-6 py-3">640px</td><td
								class="px-6 py-3 text-mid-grey"
							></td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">tablet</td><td class="font-mono px-6 py-3">768px</td
							><td class="px-6 py-3 text-mid-grey">facilities routes only</td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">md</td><td class="font-mono px-6 py-3">1024px</td><td
								class="px-6 py-3 text-mid-grey font-medium">the mobile↔desktop boundary</td
							></tr
						>
						<tr
							><td class="font-mono px-6 py-3">lg</td><td class="font-mono px-6 py-3">1440px</td><td
								class="px-6 py-3 text-mid-grey"
							></td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">xl</td><td class="font-mono px-6 py-3">1920px</td><td
								class="px-6 py-3 text-mid-grey"
							></td></tr
						>
					</tbody>
				</table>
			</div>
			<div>
				<h3 class="subhead-primary mb-4">Radii (effective)</h3>
				<table class="w-full text-sm border border-warm-grey rounded-lg">
					<tbody class="divide-y divide-warm-grey">
						<tr
							><td class="font-mono px-6 py-3">rounded-sm</td><td class="font-mono px-6 py-3"
								>≈ 2px</td
							><td class="px-6 py-3 text-mid-grey">checkboxes, legend swatches</td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">rounded-md</td><td class="font-mono px-6 py-3"
								>≈ 4px</td
							><td class="px-6 py-3 text-mid-grey">buttons, menu items</td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">rounded-lg</td><td class="font-mono px-6 py-3"
								>≈ 6px</td
							><td class="px-6 py-3 text-mid-grey">cards, tooltips, panels</td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">rounded-xl</td><td class="font-mono px-6 py-3"
								>≈ 10px</td
							><td class="px-6 py-3 text-mid-grey">shadcn cards, map controls</td></tr
						>
						<tr
							><td class="font-mono px-6 py-3">rounded-full</td><td class="font-mono px-6 py-3"
								>999px</td
							><td class="px-6 py-3 text-mid-grey">pills, toggles, map FABs</td></tr
						>
					</tbody>
				</table>
			</div>
		</div>

		<p class="text-sm text-mid-grey max-w-3xl mt-8">
			Containers centre with padding 25px → 40px (md) → 100px (lg) → 240px (xl). There is no custom
			spacing scale, but on the 10px root every Tailwind step is 2.5px —
			<code>p-4</code> = 10px, <code>gap-6</code> = 15px. Signature surface treatments: glass chrome
			(<code>bg-white/95 backdrop-blur-sm border border-mid-warm-grey shadow-md</code>) and the
			grain texture overlay (<code>/img/grain.svg</code> at 40% opacity).
		</p>
	</section>

	<!-- Components -->
	<section id="components" class="scroll-mt-24">
		{@render sectionHead(
			'05 · Library',
			'Components',
			'src/lib/components/',
			`${REPO_TREE}src/lib/components`
		)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			These are the real components, imported and rendered live — not recreations. House form
			controls live in <code>form-elements/</code> (Space Grotesk voice); primitives in
			<code>ui/</code> (shadcn-svelte, its own neutral scale).
		</p>

		<h3 class="subhead-primary mb-4">Buttons — house style</h3>
		<div class="{STAGE} flex flex-wrap items-center gap-6 mb-10">
			<Button>Primary action</Button>
			<Button secondary>Secondary</Button>
			<Button disabled>Disabled</Button>
			<Button2>Button2 / ghost</Button2>
		</div>

		<h3 class="subhead-primary mb-4">Buttons — shadcn layer</h3>
		<div class="{STAGE} flex flex-wrap items-center gap-6 mb-10">
			<ShadButton>Default</ShadButton>
			<ShadButton variant="secondary">Secondary</ShadButton>
			<ShadButton variant="outline">Outline</ShadButton>
			<ShadButton variant="ghost">Ghost</ShadButton>
			<ShadButton variant="destructive">Destructive</ShadButton>
			<ShadButton variant="link">Link</ShadButton>
		</div>

		<h3 class="subhead-primary mb-4">Form controls</h3>
		<div class="{STAGE} flex flex-wrap items-center gap-10 mb-10">
			<Toggle checked={true} />
			<Toggle checked={false} />
			<CheckboxNew name="ds-check-on" label="Solar (Rooftop)" checked={true} />
			<CheckboxNew name="ds-check-off" label="Imports" />
			<RadioBigButton
				name="ds-radio"
				label="By technology"
				checked={true}
				changeHandler={() => {}}
			/>
			<RadioBigButton name="ds-radio" label="By region" changeHandler={() => {}} />
		</div>
		<p class="text-xs text-mid-grey -mt-6 mb-10">
			The "Table" label is hardcoded inside <code>Toggle.svelte</code>.
		</p>

		<h3 class="subhead-primary mb-4">Card &amp; floating chrome</h3>
		<div class="{STAGE} flex flex-wrap items-start gap-10 mb-10">
			<Card.Root class="max-w-sm bg-white">
				<Card.Header class="">
					<Card.Title class="">NEM at a glance</Card.Title>
					<Card.Description class=""
						>Live generation across the National Electricity Market</Card.Description
					>
				</Card.Header>
				<Card.Content class="">
					<span class="font-mono font-medium text-lg tabular-nums">23,412 MW</span>
					<span class="text-xs ml-3" style:color={fuelTechColourMap.renewables}
						>▲ 42% renewables</span
					>
				</Card.Content>
			</Card.Root>
			<div class="flex flex-col items-center gap-3">
				<button class="{MAP_FAB_CLASS} size-16 text-base" aria-label="Zoom in">+</button>
				<span class="font-mono text-xxs text-mid-grey">MAP_FAB_CLASS</span>
			</div>
			<div class="flex flex-col gap-3">
				<div
					class="bg-dark-grey rounded-lg py-3 px-4 shadow text-white text-xs font-space max-w-sm leading-relaxed"
				>
					Rooftop solar is estimated from distributed PV output
				</div>
				<span class="font-mono text-xxs text-mid-grey">Tooltip surface</span>
			</div>
		</div>

		<h3 class="subhead-primary mb-4">Overlays &amp; feedback</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-4">
			Transient UI sits on dark-grey surfaces; menus and panels on white with warm-grey hairlines.
			The announcement banner is the one pure-black surface.
		</p>
		<div class="{STAGE} flex flex-wrap items-start gap-10 mb-10">
			<div class="rounded-lg bg-dark-grey text-white px-6 py-3 text-sm shadow-lg">
				Link copied to clipboard
			</div>
			<div
				class="bg-white rounded-lg shadow-lg border border-mid-warm-grey min-w-[200px] py-1 text-sm"
			>
				<div class="font-space uppercase text-xs text-mid-grey px-4 py-2">Chart type</div>
				<div class="px-4 py-1 mx-1 rounded-md hover:bg-warm-grey cursor-pointer">Stacked area</div>
				<div class="px-4 py-1 mx-1 rounded-md hover:bg-warm-grey cursor-pointer">Line</div>
				<div class="h-px bg-warm-grey my-1"></div>
				<div class="px-4 py-1 mx-1 rounded-md hover:bg-warm-grey cursor-pointer">Download CSV</div>
			</div>
			<div
				class="bg-black text-white text-sm leading-sm px-10 py-6 font-light rounded-lg basis-full"
			>
				Explore the new facilities map — every registered generator in the NEM and WEM.
				<a href="/facilities" class="text-white underline">Take a look →</a>
			</div>
		</div>

		<h3 class="subhead-primary mb-4">Facility status</h3>
		<div class="{STAGE} flex flex-wrap items-center gap-6">
			{#each statuses as status (status.name)}
				<span
					class="font-space text-xs font-medium rounded-full px-6 py-2 border border-black/10"
					style:background-color={status.hex}
					style:color={getContrastedTextCss(status.hex)}
				>
					{status.name}
				</span>
			{/each}
		</div>

		<h3 class="subhead-primary mt-12 mb-4">Icons</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-4">
			Fuel-tech glyphs (<code>*Sm</code>) render as <code>FuelTechBadge</code> chips — the
			/facilities presentation: a colour-filled circle with the glyph in <strong>white</strong>,
			flipping to <strong>black</strong> on the light backgrounds (solar, OCGT and reciprocating
			gas, data centre) via <code>needsDarkText()</code> in
			<code>$lib/utils/fueltech-display.js</code>. The glyphs stroke <code>currentColor</code>, so
			the flip is just a text-colour change. UI icons are hand-rolled Heroicon-style;
			<code>@lucide/svelte</code> is also available for anything not covered.
		</p>
		<div class={STAGE}>
			<div class="flex flex-wrap gap-6 mb-8">
				{#each ftBadgeSpecimens as code (code)}
					<div class="flex flex-col items-center gap-2 w-40">
						<FuelTechBadge fuelTech={code} size="lg" showStatus={false} />
						<span class="font-mono text-xxs text-mid-grey">{code}</span>
					</div>
				{/each}
			</div>
			<div class="flex flex-wrap gap-6">
				{#each uiIconSpecimens as icon (icon.name)}
					<div class="flex flex-col items-center gap-2 w-40">
						<span
							class="bg-white border border-warm-grey rounded-lg size-20 flex items-center justify-center text-dark-grey"
						>
							<icon.component class="size-9" />
						</span>
						<span class="font-mono text-xxs text-mid-grey">{icon.name}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Charts -->
	<section id="charts" class="scroll-mt-24">
		{@render sectionHead(
			'06 · Data visualisation',
			'Chart styling',
			'charts/v2/ChartStyles.svelte.js',
			`${REPO}src/lib/components/charts/v2/ChartStyles.svelte.js`
		)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			Charts are quiet frames for loud data: hairline 20%-black gridlines, 10px light axis text in
			mid-warm-grey, the fuel-tech palette doing all the talking, and the brick-red accent appearing
			only on focus. The specimen below renders through the production Stratum chart stack with
			synthetic data — hover it.
		</p>

		<div class="border border-warm-grey rounded-lg p-8 mb-10">
			<h6 class="m-0 mb-4 leading-none font-space uppercase text-xs font-normal">
				Generation by fuel type — typical day
			</h6>
			<DemoChart />
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<div>
				<h3 class="subhead-primary mb-4">Chart tokens</h3>
				<table class="w-full text-sm border border-warm-grey rounded-lg">
					<tbody class="divide-y divide-warm-grey">
						<tr
							><td class="px-6 py-3">Gridlines / axes / zero line</td><td
								class="font-mono px-6 py-3">{chartStyles.xAxisStroke}</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Axis tick text</td><td class="font-mono px-6 py-3"
								>10px · 300 · #C6C6C6</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Focus line (hover)</td><td class="font-mono px-6 py-3"
								>{chartStyles.focusYLineStrokeColour}</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Focus dot</td><td class="font-mono px-6 py-3"
								>{chartStyles.focusYLineDotColour} · r {chartStyles.focusYLineDotRadius}</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Net-total line</td><td class="font-mono px-6 py-3"
								>#C74523 · 2px</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Date-brush selection</td><td class="font-mono px-6 py-3"
								>#963F29 @ 22%</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Series fallback</td><td class="font-mono px-6 py-3"
								>{SERIES_FALLBACK_COLOUR}</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Default height</td><td class="font-mono px-6 py-3"
								>{chartStyles.chartHeightClasses}</td
							></tr
						>
					</tbody>
				</table>
			</div>
			<div>
				<h3 class="subhead-primary mb-4">Chart chrome type</h3>
				<table class="w-full text-sm border border-warm-grey rounded-lg">
					<tbody class="divide-y divide-warm-grey">
						<tr
							><td class="px-6 py-3">Chart title</td><td class="px-6 py-3 text-mid-grey"
								>Space Grotesk · 12px · uppercase</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Control eyebrows</td><td class="px-6 py-3 text-mid-grey"
								>Space Grotesk · 10px · uppercase</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Tooltip values</td><td class="px-6 py-3 text-mid-grey"
								>DM Mono · tabular-nums</td
							></tr
						>
						<tr
							><td class="px-6 py-3">Legend swatch</td><td class="px-6 py-3 text-mid-grey"
								>10 × 10px · 2px radius</td
							></tr
						>
					</tbody>
				</table>
				<p class="text-sm text-mid-grey mt-6">
					Observable Plot charts use two presets in
					<a href="{REPO}src/lib/components/charts/plot/PlotChartTheme.svelte.js"
						>PlotChartTheme.svelte.js</a
					>
					— <code>terminal</code> (default, DM Mono chrome) and <code>openelectricity</code>
					(DM Sans, red crosshair).
				</p>
			</div>
		</div>
	</section>

	<!-- Compositions -->
	<section id="compositions" class="scroll-mt-24">
		{@render sectionHead(
			'07 · Compositions',
			'Summary & social cards',
			'src/routes/(micro)/record/[id]',
			`${REPO_TREE}src/routes/(micro)/record/[id]`
		)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			Composed artefacts built from the foundations above — report and social cards that combine
			stat tiles, fuel-tech bars, records and the network glyph.
		</p>

		<h3 class="subhead-primary mb-4 text-center">Weekly summary cards</h3>
		<p class="text-sm text-mid-grey max-w-3xl mx-auto text-center mb-6">
			A composed specimen: the weekly energy summary card in its NEM and WEM variants — stat tiles,
			proportional fuel-tech bars and a simplified network map glyph (the real state geometry,
			trimmed for card size), all resolved from the canonical palette.
		</p>
		<div class="flex flex-col gap-8">
			<ResizeStage>
				<WeeklySummaryCard network="NEM" />
			</ResizeStage>
			<ResizeStage>
				<WeeklySummaryCard network="WEM" />
			</ResizeStage>
		</div>
		<p class="text-xs text-mid-grey mt-2 mb-10 text-center">
			Drag either side handle to test a card across widths — each card resizes independently,
			staying centred.
		</p>

		<hr class="border-0 border-t border-warm-grey my-20" />

		<h3 class="subhead-primary mb-4">Record OG card</h3>
		<p class="text-sm text-mid-grey max-w-3xl mb-6">
			The record social image is a 1200×630 Puppeteer screenshot of the
			<code>(micro)/record/[id]</code> page, generated and cached by the
			<code>record-og-image</code> worker. This is that HTML page live, scaled to fit — what you see
			is exactly what the OG pipeline captures. Open the source page directly:
			<a href="/record/{OG_RECORD_ID}?focusTime={OG_FOCUS_TIME}" target="_blank" rel="noopener"
				>/record/{OG_RECORD_ID}</a
			>
		</p>
		<div
			bind:clientWidth={ogPreviewWidth}
			class="w-full max-w-[1200px] border border-warm-grey rounded-lg overflow-hidden aspect-[1200/630]"
		>
			{#if ogPreviewWidth > 0}
				<iframe
					loading="lazy"
					src="/record/{OG_RECORD_ID}?focusTime={OG_FOCUS_TIME}"
					title="Record OG card preview"
					width="1200"
					height="630"
					class="pointer-events-none origin-top-left border-0"
					style:transform="scale({ogPreviewWidth / 1200})"
				></iframe>
			{/if}
		</div>
	</section>

	<!-- Brand -->
	<section id="brand" class="scroll-mt-24">
		{@render sectionHead(
			'08 · Identity',
			'Brand',
			'src/lib/images/logo-mark.svelte',
			`${REPO}src/lib/images/logo-mark.svelte`
		)}
		<div
			class="bg-light-warm-grey border border-warm-grey rounded-lg p-16 flex flex-wrap items-center gap-24 mb-8"
		>
			<img class="block" src="/img/logo.svg" alt="Open Electricity" />
			<LogoMark classes="w-56 h-32" />
		</div>
		<p class="text-sm text-mid-grey max-w-3xl">
			The wordmark fills with dark grey <code>#353535</code>, not black. The zig-zag "lightning
			wave" mark is the strongest brand signature: its fill cycles through the emissions-intensity
			spectrum — fossil brown → renewable green and back — over 5 seconds. When static, it takes a
			single fill from the same spectrum.
		</p>
	</section>

	<!-- Sources -->
	<section id="sources" class="scroll-mt-24">
		{@render sectionHead(
			'09 · Reference',
			'Source map',
			'github.com/opennem/openelectricity',
			'https://github.com/opennem/openelectricity'
		)}
		<p class="text-sm text-mid-grey max-w-3xl mb-8">
			Everything on this page traces to one of these files.
		</p>
		<div class="border border-warm-grey rounded-lg overflow-x-auto">
			<table class="w-full text-sm">
				<tbody class="divide-y divide-warm-grey">
					{#each sources as source (source.path)}
						<tr>
							<td class="px-6 py-3">{source.what}</td>
							<td class="font-mono text-xs px-6 py-3">
								<a
									href="{source.path.endsWith('/') ? REPO_TREE : REPO}{source.path.replace(
										/\/$/,
										''
									)}"
								>
									{source.path}
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>
