<script>
	import { onDestroy, onMount } from 'svelte';
	import clamp from '$lib/utils/clamp.js';
	import AnimationTimeline from '$lib/components/playback/AnimationTimeline.svelte';

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
	 *   tween?: boolean,
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
		tween = true,
		children
	} = $props();

	// Integer part = displayed facet index; fractional part = transition
	// progress to the next facet (0..1).
	let displayedFrame = $state(0);
	let isPlaying = $state(false);
	/** @type {number | null} */
	let rafHandle = null;

	const lastIndex = $derived(Math.max(0, facetValues.length - 1));
	const safeFrame = $derived(Number.isFinite(displayedFrame) ? Math.max(0, displayedFrame) : 0);
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
		// When tweening, lerp between floor and next frame using the fraction.
		// When not, snap to the nearest frame so the chart matches the label
		// (currentFrameIndex uses round) and jumps cleanly during playback.
		const baseIndex = tween
			? Math.floor(safeFrame)
			: Math.min(Math.round(safeFrame), frames.length - 1);
		const i = baseIndex % frames.length;
		const next = (i + 1) % frames.length;
		const t = tween ? safeFrame - Math.floor(safeFrame) : 0;
		const fromFrame = frames[i];
		const toFrame = frames[next];
		if (!fromFrame) return [];

		/** @type {Array<Record<string, any>>} */
		const out = [];
		for (const [xVal, fromRow] of fromFrame) {
			const toRow = toFrame?.get(xVal);
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

	$effect(() => {
		if (displayedFrame >= facetValues.length) displayedFrame = 0;
	});

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

	<div class="max-w-[600px] mx-auto w-full">
		<AnimationTimeline
			value={safeFrame}
			max={lastIndex}
			{isPlaying}
			disabled={facetValues.length < 2}
			ticks={facetValues.map((_, i) => i)}
			startLabel={String(facetValues[0] ?? '')}
			endLabel={String(facetValues[facetValues.length - 1] ?? '')}
			valueText={String(currentFacet)}
			ontoggle={togglePlay}
			onscrubstart={haltPlayback}
			onscrub={(v) => (displayedFrame = v)}
			onscrubend={snapDisplayedFrame}
		/>
	</div>
</div>
