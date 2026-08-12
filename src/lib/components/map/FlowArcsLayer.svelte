<script>
	/**
	 * Interconnector flow connectors — render inside a `<MapLibre>` subtree.
	 *
	 * Each corridor is a straight line from the exporting region's anchor to
	 * the importing region's anchor — the map reads "power moving from this
	 * state to that one", not the physical route (that's the transmission
	 * layer's job). Three cues per corridor:
	 *
	 *   - the line itself, width scaled by MW;
	 *   - a trips-style comet — a glowing head with a fading tail sweeping
	 *     exporter -> importer, animated as a native MapLibre line-gradient
	 *     (idle corridors get a plain line);
	 *   - a horizontal MW box pinned where the connector crosses the state
	 *     border (`borderPoint`): a direction eyebrow (`NSW → VIC`) over the
	 *     figure — DOM, so it never rotates with the line and stays legible on
	 *     every basemap, and the static direction cue under
	 *     prefers-reduced-motion (where the sweep never starts).
	 *
	 * Both the line and the MW box are click targets reporting the flow key.
	 * `selectedKey` emphasises one corridor (its box inverts to the selected
	 * ink); `highlightRegion` dims corridors that don't touch the given region
	 * (uppercase code, e.g. 'NSW1'). Corridors without a live value draw an
	 * idle line only — no sweep, no box — matching the price chips' "no data,
	 * no chip" rule.
	 */
	import { GeoJSONSource, LineLayer, Marker, getMapContext } from 'svelte-maplibre-gl';
	import {
		INTERCONNECTORS,
		NEAR_ZERO_MW,
		corridorCoords,
		corridorLiveStatus,
		directionLabel,
		icSlug,
		interconnectorsForRegion
	} from '$lib/flows/region-geo.js';
	import { CORRIDOR_COLOUR } from '$lib/flows/format.js';
	import clamp from '$lib/utils/clamp.js';

	/**
	 * @type {{
	 *   flows?: Record<string, number | null | undefined>,
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   selectedKey?: string | null,
	 *   highlightRegion?: string | null,
	 *   onarcclick?: (key: string) => void
	 * }}
	 */
	let {
		flows = {},
		mapTheme = 'light',
		selectedKey = null,
		highlightRegion = null,
		onarcclick = undefined
	} = $props();

	const mapCtx = getMapContext();

	// One sweep per corridor every beat; the tail is a fraction of the line,
	// and the head runs past the end so the tail fully exits before the loop
	// restarts.
	const SWEEP_PERIOD_MS = 2600;
	const SWEEP_TAIL = 0.35;
	const SWEEP_CYCLE = 1 + SWEEP_TAIL;
	/** Per-corridor phase offset (fraction of a period) so the four sweeps
	 *  don't move in lockstep. */
	const SWEEP_STAGGER = 0.37;

	/** The sweep's tone — the OpenNEM brand red (tailwind `red`, #C74523),
	 *  legible on the slate line across all three basemaps. */
	const SWEEP_RGB = '199, 69, 35';

	// Styling per basemap theme; `box*` keys are the border MW box's surface —
	// quiet card idiom (white on light, charcoal on dark/satellite) with the
	// selected corridor inverting to the selected ink.
	const PALETTES = {
		light: {
			base: CORRIDOR_COLOUR,
			idle: '#aab6c2',
			selected: '#33475c',
			boxBg: 'rgba(255,255,255,0.95)',
			boxInk: '#39485a',
			boxMutedInk: '#8b98a5',
			boxBorder: 'rgba(0,0,0,0.1)',
			boxSelectedBg: '#ffffff',
			boxSelectedInk: '#33475c'
		},
		dark: {
			base: '#8fa6c0',
			idle: '#4a5560',
			selected: '#c9d9ec',
			boxBg: 'rgba(28,33,40,0.92)',
			boxInk: '#e6edf4',
			boxMutedInk: '#77828e',
			boxBorder: 'rgba(255,255,255,0.16)',
			boxSelectedBg: '#ffffff',
			boxSelectedInk: '#16202b'
		},
		satellite: {
			base: '#8fa6c0',
			idle: '#5a646e',
			selected: '#c9d9ec',
			boxBg: 'rgba(16,21,26,0.92)',
			boxInk: '#eef3f8',
			boxMutedInk: '#7d8894',
			boxBorder: 'rgba(255,255,255,0.22)',
			boxSelectedBg: '#ffffff',
			boxSelectedInk: '#16202b'
		}
	};
	let palette = $derived(PALETTES[mapTheme] ?? PALETTES.light);

	let highlightedKeys = $derived(
		highlightRegion ? new Set(interconnectorsForRegion(highlightRegion).map((ic) => ic.key)) : null
	);

	// One record per corridor driving all three cues, built on the shared
	// status/direction derivations so the map can never disagree with the
	// panel rows. Direction is encoded by which anchor is the tail: positive
	// flows run from -> to, negative in reverse; the sweep walks tail -> head,
	// so geometry (not paint) carries the direction, and the box eyebrow
	// states it in words. Endpoints are the region anchors themselves — the
	// price chips are opaque DOM markers drawn above the canvas, so the line
	// terminates underneath its chip and reads as touching it.
	let connectors = $derived.by(() =>
		INTERCONNECTORS.map((ic) => {
			const { value, mw, idle } = corridorLiveStatus(flows, ic);
			const [fromAnchor, toAnchor] = corridorCoords(ic);
			const [tail, head] = (value ?? 0) >= 0 ? [fromAnchor, toAnchor] : [toAnchor, fromAnchor];
			return {
				ic,
				value,
				mw: mw ?? 0,
				idle,
				tail,
				head,
				direction:
					idle || value === undefined ? 'idle' : directionLabel(ic, value, { short: true }),
				selected: ic.key === selectedKey,
				dimmed:
					ic.key !== selectedKey && highlightedKeys !== null && !highlightedKeys.has(ic.key)
			};
		})
	);

	// `lineMetrics` on the source feeds the comet layers' line-gradient. Each
	// feature's coordinate order is its flow direction, so line-progress 0 is
	// always the exporter end.
	let arcsGeoJSON = $derived(
		/** @type {GeoJSON.FeatureCollection} */ ({
			type: 'FeatureCollection',
			features: connectors.map((c) => ({
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: [c.tail, c.head] },
				properties: {
					key: c.ic.key,
					mw: c.mw,
					selected: c.selected,
					dimmed: c.dimmed
				}
			}))
		})
	);

	/** @typedef {NonNullable<import('svelte').ComponentProps<typeof LineLayer>['paint']>} LinePaintSpec */

	// Static expression parts, hoisted so palette swaps rebuild only the
	// colour-bearing paint keys — stable arrays let svelte-maplibre-gl's
	// per-key diffing skip the rest.
	/** @type {any} */
	const IDLE_MW_TEST = ['<', ['get', 'mw'], NEAR_ZERO_MW];
	/** @type {any} */
	const SELECTED_TEST = ['boolean', ['get', 'selected'], false];
	/** @type {any} */
	const DIMMED_TEST = ['boolean', ['get', 'dimmed'], false];
	/** @type {LinePaintSpec['line-width']} */
	const BASE_LINE_WIDTH = [
		'case',
		SELECTED_TEST,
		['interpolate', ['linear'], ['get', 'mw'], 0, 2.5, 1700, 6.5],
		['interpolate', ['linear'], ['get', 'mw'], 0, 1.5, 1700, 5]
	];
	/** Halo under the comet core — ~2.5x the stroke it glows around. @type {any} */
	const GLOW_LINE_WIDTH = ['interpolate', ['linear'], ['get', 'mw'], 0, 5, 1700, 13];

	let basePaint = $derived(
		/** @type {import('svelte').ComponentProps<typeof LineLayer>['paint']} */ ({
			'line-color': [
				'case',
				SELECTED_TEST,
				palette.selected,
				IDLE_MW_TEST,
				palette.idle,
				palette.base
			],
			'line-width': BASE_LINE_WIDTH,
			// Faint guide, not the star — the red sweep carries the corridor, so
			// the base line just holds the route (selected a step stronger).
			'line-opacity': ['case', DIMMED_TEST, 0.1, SELECTED_TEST, 0.4, 0.25]
		})
	);

	// ============================================
	// Comet sweep — native line-gradient animation
	// ============================================

	/** @param {string} key */
	const cometLayerId = (key) => `flow-comet-${icSlug(key)}`;
	/** @param {string} key */
	const cometGlowLayerId = (key) => `flow-comet-glow-${icSlug(key)}`;

	/** Per-corridor clock inputs, hoisted out of the 60fps tick — the ids and
	 *  stagger offsets never change. */
	const COMET_CLOCK = INTERCONNECTORS.map((ic, i) => ({
		ids: [cometLayerId(ic.key), cometGlowLayerId(ic.key)],
		offset: i * SWEEP_STAGGER
	}));

	/**
	 * Comet gradient at `phase` [0, SWEEP_CYCLE): transparent everywhere
	 * except a window whose alpha ramps up from the tail to a hard bright
	 * head. Stops are clamped to [0,1] and deduped ascending — interpolate
	 * expressions reject anything else.
	 * @param {number} phase
	 * @returns {any}
	 */
	function cometGradient(phase) {
		const tailPos = phase - SWEEP_TAIL;
		const headPos = phase;
		/** @type {any[]} */
		const expr = ['interpolate', ['linear'], ['line-progress']];
		let last = -1;
		let stops = 0;
		const addStop = (/** @type {number} */ x, /** @type {number} */ alpha) => {
			const cx = clamp(x, 0, 1);
			if (cx <= last + 1e-4) return;
			last = cx;
			stops++;
			expr.push(cx, `rgba(${SWEEP_RGB}, ${alpha.toFixed(3)})`);
		};
		const alphaAt = (/** @type {number} */ x) =>
			x < tailPos || x > headPos ? 0 : 0.9 * ((x - tailPos) / SWEEP_TAIL);

		addStop(0, alphaAt(0));
		addStop(tailPos, 0);
		addStop(Math.min(headPos, 1), alphaAt(Math.min(headPos, 1)));
		if (headPos < 1) addStop(headPos + 0.003, 0);
		// Interpolate needs at least two stops; a fully-off frame collapses to one.
		if (stops < 2) addStop(1, 0);
		return expr;
	}

	// Comet clock: sweep each corridor's gradient layer with a staggered
	// phase, straight through setPaintProperty. MUST wait for the map's
	// `load` event: ANY per-frame style mutation (setData or setPaintProperty
	// alike) re-dirties the map before every render, `map.loaded()` is never
	// true, and the once-only `load` event never fires — stranding the page's
	// map-loading overlay. After `load` the flag is latched, so continuous
	// mutation is harmless. The declared paint carries a transparent
	// line-color and no line-gradient, so before the first tick — and
	// permanently under prefers-reduced-motion, where this clock never
	// starts — the comet layers draw nothing and the box eyebrow carries
	// direction alone.
	$effect(() => {
		const map = mapCtx.map;
		if (!map) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let raf = 0;
		const start = () => {
			raf = requestAnimationFrame(function tick(now) {
				const live = connectors;
				COMET_CLOCK.forEach((corridor, i) => {
					// Idle corridors' comet layers sit at opacity 0 — skipping them
					// also leaves the map fully quiescent until flows first arrive.
					if (live[i]?.idle !== false) return;
					const phase = ((now / SWEEP_PERIOD_MS + corridor.offset) % 1) * SWEEP_CYCLE;
					const gradient = cometGradient(phase);
					// One gradient per corridor, applied to the crisp core and its
					// blurred halo so the glow travels in lockstep. validate: false —
					// the expression is machine-built, so per-frame spec validation
					// buys nothing.
					for (const layerId of corridor.ids) {
						if (map.getLayer(layerId)) {
							map.setPaintProperty(layerId, 'line-gradient', gradient, { validate: false });
						}
					}
				});
				raf = requestAnimationFrame(tick);
			});
		};
		// `_loaded` is the latched "load has fired" flag (private but stable) —
		// the public loaded() is a live dirtiness check that can be transiently
		// false at any time, and waiting on the once-only `load` event after it
		// has already fired would wait forever.
		if (/** @type {any} */ (map)._loaded) start();
		else map.once('load', start);
		return () => {
			map.off('load', start);
			cancelAnimationFrame(raf);
		};
	});

	/** @param {any} e */
	function handleArcClick(e) {
		const key = e?.features?.[0]?.properties?.key;
		if (key) onarcclick?.(key);
	}

	function handleMouseEnter() {
		if (!onarcclick) return;
		const canvas = mapCtx.map?.getCanvas();
		if (canvas) canvas.style.cursor = 'pointer';
	}

	function handleMouseLeave() {
		if (!onarcclick) return;
		const canvas = mapCtx.map?.getCanvas();
		if (canvas) canvas.style.cursor = '';
	}
</script>

<GeoJSONSource id="flow-arcs" data={arcsGeoJSON} lineMetrics={true}>
	<LineLayer
		id="flow-arcs-base"
		paint={basePaint}
		layout={{ 'line-cap': 'round', 'line-join': 'round' }}
		onclick={handleArcClick}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	/>

	<!-- Two gradient layers per corridor — a wide blurred halo under a crisp
	     core, sharing one animated gradient, is what reads as glow.
	     line-gradient is per-layer, and per-corridor layers are what let the
	     sweeps stagger. The clock owns line-gradient; declaring it here would
	     let unrelated paint diffs clobber the sweep mid-frame (the dasharray
	     lesson). -->
	{#each connectors as c (c.ic.key)}
		<LineLayer
			id={cometGlowLayerId(c.ic.key)}
			filter={['==', ['get', 'key'], c.ic.key]}
			paint={{
				'line-color': 'rgba(0, 0, 0, 0)',
				'line-width': GLOW_LINE_WIDTH,
				'line-blur': 4,
				'line-opacity': c.idle ? 0 : c.dimmed ? 0.12 : 0.5
			}}
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
		/>
		<LineLayer
			id={cometLayerId(c.ic.key)}
			filter={['==', ['get', 'key'], c.ic.key]}
			paint={{
				'line-color': 'rgba(0, 0, 0, 0)',
				'line-width': BASE_LINE_WIDTH,
				'line-opacity': c.idle ? 0 : c.dimmed ? 0.25 : 1
			}}
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
		/>
	{/each}
</GeoJSONSource>

<!-- Border MW boxes: direction eyebrow over the corridor's figure, horizontal
     at the state border. Same scale and rounded-lg radius as the filter
     pills, so the map's data boxes read as one family with the filter bar
     rather than map chips. Click selects the corridor, same as the line. -->
{#each connectors as c (c.ic.key)}
	{#if c.value !== undefined}
		<Marker lnglat={c.ic.borderPoint}>
			{#snippet content()}
				<button
					type="button"
					onclick={() => onarcclick?.(c.ic.key)}
					aria-label="{c.ic.label}: {c.direction}, {Math.round(c.mw)} megawatts"
					aria-pressed={c.selected}
					class="flex cursor-pointer select-none flex-col items-center gap-1 rounded-lg border px-2.5 pt-1.5 pb-1 font-mono shadow-sm transition-[opacity,background-color,color] duration-300 {c.dimmed
						? 'opacity-40'
						: 'opacity-100'}"
					style="background-color: {c.selected ? palette.boxSelectedBg : palette.boxBg};
						color: {c.selected ? palette.boxSelectedInk : c.idle ? palette.boxMutedInk : palette.boxInk};
						border-color: {c.selected ? palette.selected : palette.boxBorder};"
				>
					<span
						class="text-[10px] font-medium leading-3 tracking-wide {c.selected ? 'opacity-80' : ''}"
						style={c.selected ? '' : `color: ${palette.boxMutedInk};`}
					>
						{c.direction}
					</span>
					<span class="text-sm font-semibold leading-5 tabular-nums">
						{Math.round(c.mw)}<span class="text-[10px] font-normal opacity-60">&nbsp;MW</span>
					</span>
				</button>
			{/snippet}
		</Marker>
	{/if}
{/each}
