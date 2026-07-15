<script>
	import clamp from '$lib/utils/clamp.js';

	/**
	 * Shared animation playback controls: a square play/pause button beside a
	 * bordered, scrubbable timeline with tick marks and start/end labels.
	 * Generalised over a numeric [min, max] domain — the consumer owns the
	 * playback engine and reacts to the scrub callbacks (halt on scrubstart,
	 * snap on scrubend). Extracted from Stratify's AnimatedFacetChart player
	 * so other animated views share the same UI.
	 *
	 * @type {{
	 *   value: number,
	 *   max: number,
	 *   min?: number,
	 *   isPlaying?: boolean,
	 *   disabled?: boolean,
	 *   ticks?: number[],
	 *   markValue?: number | null,
	 *   markClass?: string,
	 *   startLabel?: string,
	 *   endLabel?: string,
	 *   labelClass?: string,
	 *   valueText?: string,
	 *   ariaLabel?: string,
	 *   ontoggle?: () => void,
	 *   onscrubstart?: () => void,
	 *   onscrub?: (value: number) => void,
	 *   onscrubend?: () => void
	 * }}
	 */
	let {
		value,
		max,
		min = 0,
		isPlaying = false,
		disabled = false,
		ticks = [],
		// A single emphasised marker on the track (e.g. the current year),
		// rendered taller and in markClass's colour, distinct from the ticks.
		markValue = null,
		markClass = 'bg-red',
		startLabel = '',
		endLabel = '',
		labelClass = 'text-[10px]',
		valueText = '',
		ariaLabel = 'Animation timeline',
		ontoggle,
		onscrubstart,
		onscrub,
		onscrubend
	} = $props();

	const span = $derived(max - min);
	const progress = $derived(span > 0 ? clamp(((value - min) / span) * 100, 0, 100) : 0);

	let isScrubbing = $state(false);
	/** @type {DOMRect | null} */
	let scrubRect = null;

	/** @param {PointerEvent} event */
	function scrubToEvent(event) {
		if (span <= 0 || !scrubRect) return;
		const pct = clamp((event.clientX - scrubRect.left) / scrubRect.width, 0, 1);
		onscrub?.(min + pct * span);
	}

	/** @param {PointerEvent} event */
	function handleScrubPointerDown(event) {
		if (disabled) return;
		onscrubstart?.();
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
		onscrubend?.();
	}

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (disabled) return;
		const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
		if (!delta) return;
		event.preventDefault();
		onscrubstart?.();
		onscrub?.(clamp(Math.round(value) + delta, min, max));
		onscrubend?.();
	}

	// Measured to size the play button as a true square matching the timeline
	// (aspect-ratio is unreliable when the height comes from flex-stretch).
	let timelineHeight = $state(0);
</script>

<div class="flex items-start gap-2 w-full">
	<button
		type="button"
		onclick={() => ontoggle?.()}
		{disabled}
		style="width: {timelineHeight}px; height: {timelineHeight}px"
		class="shrink-0 bg-black text-white rounded-lg transition-all hover:bg-dark-grey disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
		title={isPlaying ? 'Pause' : 'Play'}
		aria-label={isPlaying ? 'Pause' : 'Play'}
	>
		{#if isPlaying}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="size-5"
			>
				<rect x="6" y="5" width="4" height="14" rx="1" />
				<rect x="14" y="5" width="4" height="14" rx="1" />
			</svg>
		{:else}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="size-5"
			>
				<path
					d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z"
				/>
			</svg>
		{/if}
	</button>

	<div class="flex-1 min-w-0">
		{#if !disabled}
			<div bind:clientHeight={timelineHeight} class="border border-warm-grey rounded-lg px-3 py-2">
				<div
					role="slider"
					tabindex="0"
					aria-label={ariaLabel}
					aria-valuemin={min}
					aria-valuemax={max}
					aria-valuenow={clamp(Math.round(value), min, max)}
					aria-valuetext={valueText || undefined}
					onpointerdown={handleScrubPointerDown}
					onpointermove={handleScrubPointerMove}
					onpointerup={handleScrubPointerUp}
					onpointercancel={handleScrubPointerUp}
					onkeydown={handleKeydown}
					class="relative h-3 cursor-pointer touch-none group flex items-center select-none"
				>
					<div class="relative w-full h-1 rounded-full bg-warm-grey/50 overflow-hidden">
						<div
							class="absolute inset-y-0 left-0 rounded-full bg-dark-grey"
							style="width: {progress}%"
						></div>
					</div>
					{#each ticks as tick, i (i)}
						{@const left = span > 0 ? clamp(((tick - min) / span) * 100, 0, 100) : 0}
						<span
							class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-2 bg-mid-grey/40"
							style="left: {left}%"
						></span>
					{/each}
					{#if markValue !== null && span > 0 && markValue >= min && markValue <= max}
						<span
							class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-2.5 {markClass}"
							style="left: {clamp(((markValue - min) / span) * 100, 0, 100)}%"
						></span>
					{/if}
					<div
						class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-dark-grey shadow-sm ring-2 ring-light-warm-grey transition-transform group-hover:scale-125 {isScrubbing
							? 'scale-125'
							: ''}"
						style="left: {progress}%"
					></div>
				</div>
			</div>
			<div class="flex justify-between {labelClass} text-mid-grey mt-1.5 px-3 tabular-nums">
				<span>{startLabel}</span>
				<span>{endLabel}</span>
			</div>
		{/if}
	</div>
</div>
