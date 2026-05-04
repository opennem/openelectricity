<script>
	import { onDestroy } from 'svelte';

	/**
	 * Animate through a facet column's unique values by interpolating row
	 * values between adjacent facets each rAF tick, so the chart morphs
	 * smoothly rather than snapping. Computes a stable global Y domain
	 * across all facets and emits the interpolated frame via a snippet.
	 *
	 * @type {{
	 *   data: Array<Record<string, any>>,
	 *   seriesNames: string[],
	 *   facetColumn: string,
	 *   facetValues: any[],
	 *   frameDurationMs?: number,
	 *   loop?: boolean,
	 *   children: (frame: {
	 *     data: Array<Record<string, any>>,
	 *     yMin: number,
	 *     yMax: number,
	 *     facet: any
	 *   }) => any
	 * }}
	 */
	let {
		data,
		seriesNames,
		facetColumn,
		facetValues,
		frameDurationMs = 800,
		loop = false,
		children
	} = $props();

	// Integer part = displayed facet index; fractional part = transition
	// progress to the next facet (0..1).
	let displayedFrame = $state(0);
	let isPlaying = $state(false);
	/** @type {number | null} */
	let rafHandle = null;

	const currentFrameIndex = $derived(
		Math.min(Math.round(displayedFrame), Math.max(0, facetValues.length - 1))
	);
	const currentFacet = $derived(facetValues[currentFrameIndex] ?? facetValues[0]);

	// Align rows across facets by their X-axis value (`time`/`linear`/`category`)
	// so the lerp pairs the right points. Note: time-series uses `time` (numeric
	// ms), not `date` (separate Date instances per row don't match in a Map).
	const xKey = $derived.by(() => {
		const first = data[0];
		if (!first) return 'time';
		if ('linear' in first) return 'linear';
		if ('category' in first) return 'category';
		return 'time';
	});

	/** Pre-grouped: for each facet, a Map<xValue, row> for fast lookup. */
	const framesByIndex = $derived.by(() => {
		const xk = xKey;
		/** @type {Array<Map<any, Record<string, any>>>} */
		const out = facetValues.map(() => new Map());
		const facetIndex = new Map(facetValues.map((v, i) => [v, i]));
		for (const row of data) {
			const idx = facetIndex.get(row[facetColumn]);
			if (idx === undefined) continue;
			out[idx].set(row[xk], row);
		}
		return out;
	});

	// Global y-bounds across every facet so the axis doesn't drift mid-frame.
	const yBounds = $derived.by(() => {
		let max = -Infinity;
		for (const row of data) {
			for (const name of seriesNames) {
				const v = row[name];
				if (v != null && isFinite(v) && v > max) max = v;
			}
		}
		return { min: 0, max: isFinite(max) ? max : 1 };
	});

	const frameData = $derived.by(() => {
		const frames = framesByIndex;
		if (frames.length === 0) return [];
		// Reactive updates can briefly observe stale displayedFrame values when
		// facetValues changes underneath us; clamp to a safe non-negative index.
		const safeFrame = Number.isFinite(displayedFrame) ? Math.max(0, displayedFrame) : 0;
		const floor = Math.floor(safeFrame);
		const i = floor % frames.length;
		const next = (i + 1) % frames.length;
		const t = safeFrame - floor;
		const fromFrame = frames[i];
		const toFrame = frames[next];
		if (!fromFrame || !toFrame) return [];

		/** @type {Array<Record<string, any>>} */
		const out = [];
		for (const [xVal, fromRow] of fromFrame) {
			const toRow = toFrame.get(xVal);
			const merged = { ...fromRow };
			if (toRow && t > 0) {
				for (const name of seriesNames) {
					const a = Number(fromRow[name]) || 0;
					const b = Number(toRow[name]) || 0;
					merged[name] = a + (b - a) * t;
				}
			}
			out.push(merged);
		}
		return out;
	});

	function stop() {
		isPlaying = false;
		if (rafHandle != null) {
			cancelAnimationFrame(rafHandle);
			rafHandle = null;
		}
	}

	function play() {
		if (isPlaying || facetValues.length < 2) return;
		// If we're sitting on the last frame and not looping, rewind so Play
		// from the end starts a fresh pass instead of stopping immediately.
		const lastIndex = facetValues.length - 1;
		if (!loop && displayedFrame >= lastIndex) displayedFrame = 0;
		isPlaying = true;
		let lastTime = performance.now();
		const tick = (/** @type {number} */ now) => {
			if (!isPlaying) return;
			const elapsed = now - lastTime;
			lastTime = now;
			const advance = elapsed / Math.max(50, frameDurationMs);
			let next = displayedFrame + advance;
			if (next >= facetValues.length) {
				if (loop) {
					while (next >= facetValues.length) next -= facetValues.length;
				} else {
					displayedFrame = lastIndex;
					stop();
					return;
				}
			}
			displayedFrame = next;
			rafHandle = requestAnimationFrame(tick);
		};
		rafHandle = requestAnimationFrame(tick);
	}

	function togglePlay() {
		if (isPlaying) stop();
		else play();
	}

	/** @param {number} delta */
	function step(delta) {
		stop();
		const target = (currentFrameIndex + delta + facetValues.length) % facetValues.length;
		displayedFrame = target;
	}

	$effect(() => {
		if (displayedFrame >= facetValues.length) displayedFrame = 0;
	});

	onDestroy(stop);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center gap-2 px-1">
		<button
			type="button"
			onclick={togglePlay}
			disabled={facetValues.length < 2}
			class="inline-flex items-center justify-center w-7 h-7 rounded border border-warm-grey bg-light-warm-grey/50 text-dark-grey hover:bg-warm-grey/40 disabled:opacity-40 disabled:cursor-not-allowed"
			aria-label={isPlaying ? 'Pause' : 'Play'}
		>
			{#if isPlaying}
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
					<rect x="1" y="1" width="3" height="8" />
					<rect x="6" y="1" width="3" height="8" />
				</svg>
			{:else}
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
					<polygon points="2,1 9,5 2,9" />
				</svg>
			{/if}
		</button>
		<button
			type="button"
			onclick={() => step(-1)}
			disabled={facetValues.length < 2}
			class="inline-flex items-center justify-center w-7 h-7 rounded border border-warm-grey bg-light-warm-grey/50 text-dark-grey hover:bg-warm-grey/40 disabled:opacity-40"
			aria-label="Previous frame"
		>
			‹
		</button>
		<button
			type="button"
			onclick={() => step(1)}
			disabled={facetValues.length < 2}
			class="inline-flex items-center justify-center w-7 h-7 rounded border border-warm-grey bg-light-warm-grey/50 text-dark-grey hover:bg-warm-grey/40 disabled:opacity-40"
			aria-label="Next frame"
		>
			›
		</button>
		<span class="text-xs text-mid-grey font-medium ml-2">
			{String(currentFacet)}
			<span class="text-mid-grey/60">
				({currentFrameIndex + 1} / {facetValues.length})
			</span>
		</span>
	</div>

	{@render children({
		data: frameData,
		yMin: yBounds.min,
		yMax: yBounds.max,
		facet: currentFacet
	})}
</div>
