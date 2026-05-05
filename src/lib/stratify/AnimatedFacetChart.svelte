<script>
	import { onDestroy, onMount } from 'svelte';
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
	 *   autoPlay?: boolean,
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
		autoPlay = false,
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

	function haltPlayback() {
		isPlaying = false;
		if (rafHandle != null) {
			cancelAnimationFrame(rafHandle);
			rafHandle = null;
		}
	}

	function snapDisplayedFrame() {
		// Integer displayedFrame ⇒ frameData's t=0 ⇒ raw frame, no interpolation.
		if (Number.isFinite(displayedFrame)) {
			displayedFrame = Math.round(displayedFrame);
		}
	}

	function stop() {
		haltPlayback();
		snapDisplayedFrame();
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

	let isScrubbing = $state(false);
	/** @type {DOMRect | null} */
	let scrubRect = null;

	/** @param {PointerEvent} event */
	function scrubToEvent(event) {
		if (lastIndex === 0 || !scrubRect) return;
		const pct = clamp((event.clientX - scrubRect.left) / scrubRect.width, 0, 1);
		displayedFrame = pct * lastIndex;
	}

	/** @param {PointerEvent} event */
	function handleScrubPointerDown(event) {
		if (facetValues.length < 2) return;
		haltPlayback();
		isScrubbing = true;
		const target = /** @type {HTMLElement} */ (event.currentTarget);
		target.setPointerCapture(event.pointerId);
		scrubRect = target.getBoundingClientRect();
		scrubToEvent(event);
	}

	/** @param {PointerEvent} event */
	function handleScrubPointerMove(event) {
		if (!isScrubbing) return;
		scrubToEvent(event);
	}

	function handleScrubPointerUp() {
		if (!isScrubbing) return;
		isScrubbing = false;
		scrubRect = null;
		snapDisplayedFrame();
	}

	const timelineProgress = $derived(
		lastIndex > 0 ? Math.min(1, safeFrame / lastIndex) * 100 : 0
	);

	$effect(() => {
		if (displayedFrame >= facetValues.length) displayedFrame = 0;
	});

	// Measured to size the play button as a true square matching the timeline
	// (aspect-ratio is unreliable when the height comes from flex-stretch).
	let timelineHeight = $state(0);

	onMount(() => {
		if (autoPlay && facetValues.length >= 2) play();
	});

	onDestroy(stop);
</script>

<div class="flex flex-col gap-3">
	<div class="relative">
		{#if facetValues.length >= 2}
			<div
				class="absolute top-2 left-0 right-8 z-10 flex justify-between items-center pointer-events-none"
			>
				<span></span>
				<span class="text-base font-bold text-dark-grey tabular-nums">
					{String(currentFacet)}
				</span>
			</div>
		{/if}
		{@render children({
			data: frameData,
			yMin: yBounds.min,
			yMax: yBounds.max,
			facet: currentFacet
		})}
	</div>

	<div class="flex items-start gap-2 max-w-[600px] mx-auto w-full">
		<button
			type="button"
			onclick={togglePlay}
			disabled={facetValues.length < 2}
			style="width: {timelineHeight}px; height: {timelineHeight}px"
			class="shrink-0 bg-black text-white rounded-lg transition-all hover:bg-dark-grey disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
			title={isPlaying ? 'Pause' : 'Play'}
			aria-label={isPlaying ? 'Pause' : 'Play'}
		>
			{#if isPlaying}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
					<rect x="6" y="5" width="4" height="14" rx="1" />
					<rect x="14" y="5" width="4" height="14" rx="1" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
					<path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
				</svg>
			{/if}
		</button>

		<div class="flex-1 min-w-0">
			{#if facetValues.length >= 2}
				<div bind:clientHeight={timelineHeight} class="border border-warm-grey rounded-lg px-3 py-2">
					<div
						role="slider"
						tabindex="0"
						aria-label="Animation timeline"
						aria-valuemin="0"
						aria-valuemax={lastIndex}
						aria-valuenow={currentFrameIndex}
						aria-valuetext={String(currentFacet)}
						onpointerdown={handleScrubPointerDown}
						onpointermove={handleScrubPointerMove}
						onpointerup={handleScrubPointerUp}
						onpointercancel={handleScrubPointerUp}
						class="relative h-3 cursor-pointer touch-none group flex items-center select-none"
					>
						<div class="relative w-full h-1 rounded-full bg-warm-grey/50 overflow-hidden">
							<div
								class="absolute inset-y-0 left-0 rounded-full bg-dark-grey"
								style="width: {timelineProgress}%"
							></div>
						</div>
						{#each facetValues as _value, i (i)}
							{@const left = (i / (facetValues.length - 1)) * 100}
							<span
								class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-2 bg-mid-grey/40"
								style="left: {left}%"
							></span>
						{/each}
						<div
							class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-dark-grey shadow-sm ring-2 ring-light-warm-grey transition-transform group-hover:scale-125 {isScrubbing
								? 'scale-125'
								: ''}"
							style="left: {timelineProgress}%"
						></div>
					</div>
				</div>
				<div class="flex justify-between text-[10px] text-mid-grey mt-1.5 px-3 tabular-nums">
					<span>{String(facetValues[0])}</span>
					<span>{String(facetValues[facetValues.length - 1])}</span>
				</div>
			{/if}
		</div>
	</div>
</div>
