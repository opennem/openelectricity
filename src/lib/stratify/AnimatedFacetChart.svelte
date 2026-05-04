<script>
	import { onDestroy } from 'svelte';
	import clamp from '$lib/utils/clamp.js';

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

	const lastIndex = $derived(Math.max(0, facetValues.length - 1));
	const safeFrame = $derived(
		Number.isFinite(displayedFrame) ? Math.max(0, displayedFrame) : 0
	);
	const currentFrameIndex = $derived(Math.min(Math.round(displayedFrame), lastIndex));
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
		// If sitting on the last frame and not looping, rewind so Play from
		// the end starts a fresh pass instead of stopping immediately.
		if (!loop && displayedFrame >= lastIndex) displayedFrame = 0;
		isPlaying = true;
		let lastTime = performance.now();
		const tick = (/** @type {number} */ now) => {
			if (!isPlaying) return;
			const elapsed = now - lastTime;
			lastTime = now;
			const advance = elapsed / Math.max(50, frameDurationMs);
			let next = displayedFrame + advance;
			if (loop) {
				// Hold one tick on the last frame so its data renders fully,
				// then snap back to 0 — avoids lerping last → first.
				if (displayedFrame >= lastIndex) next = 0;
				else if (next > lastIndex) next = lastIndex;
			} else if (next >= lastIndex) {
				displayedFrame = lastIndex;
				stop();
				return;
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

	/** @param {number} index */
	function seek(index) {
		stop();
		displayedFrame = clamp(index, 0, lastIndex);
	}

	const timelineProgress = $derived(
		lastIndex > 0 ? Math.min(1, safeFrame / lastIndex) * 100 : 0
	);

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

	{#if facetValues.length >= 2}
		<div class="px-1">
			<div class="relative h-6">
				<div class="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-warm-grey"></div>
				{#each facetValues as value, i (i)}
					{@const left = (i / (facetValues.length - 1)) * 100}
					{@const isCurrent = i === currentFrameIndex}
					<button
						type="button"
						onclick={() => seek(i)}
						aria-label={`Go to ${String(value)}`}
						class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group flex items-center justify-center w-3 h-6 cursor-pointer"
						style="left: {left}%"
					>
						<span
							class="block w-px transition-all {isCurrent
								? 'h-4 bg-dark-grey'
								: 'h-2 bg-mid-grey/60 group-hover:h-3 group-hover:bg-dark-grey'}"
						></span>
					</button>
				{/each}
				<div
					class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-dark-grey ring-2 ring-light-warm-grey"
					style="left: {timelineProgress}%"
				></div>
			</div>
			<div class="flex justify-between text-[10px] text-mid-grey mt-0.5">
				<span>{String(facetValues[0])}</span>
				<span>{String(facetValues[facetValues.length - 1])}</span>
			</div>
		</div>
	{/if}

	{@render children({
		data: frameData,
		yMin: yBounds.min,
		yMax: yBounds.max,
		facet: currentFacet
	})}
</div>
