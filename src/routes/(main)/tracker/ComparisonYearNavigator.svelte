<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import {
		NAVIGATION_SHORTCUTS,
		formatDailyWindow,
		navigationStep,
		shiftWindow,
		windowEndingAt
	} from './comparison-navigation.js';

	/**
	 * The daily interval's year window: step a year either way, read the
	 * window's first and last day, and jump back to the latest complete day.
	 * Keyboard moves work while the navigator has focus.
	 * @type {{viewport: {start: number, end: number}, bounds: {start: number, end: number},
	 *   onmove: (viewport: {start: number, end: number}) => void}}
	 */
	let { viewport, bounds, onmove } = $props();
	let atLatest = $derived(viewport.end >= bounds.end);
	let atStart = $derived(viewport.start <= bounds.start);
	/** @param {KeyboardEvent} event */
	function keydown(event) {
		const next = navigationStep(event, viewport, bounds);
		if (!next) return;
		event.preventDefault();
		onmove(next);
	}
	const button =
		'flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-mid-warm-grey bg-white text-mid-grey transition-colors hover:border-dark-grey hover:text-dark-grey disabled:cursor-not-allowed disabled:text-mid-warm-grey disabled:hover:border-mid-warm-grey';
</script>

<div
	role="group"
	aria-label="Year window"
	title={NAVIGATION_SHORTCUTS}
	class="flex shrink-0 items-center gap-2"
>
	<button
		type="button"
		class={button}
		aria-label="Previous year"
		aria-keyshortcuts="ArrowLeft Shift+ArrowLeft Meta+ArrowLeft Home End"
		disabled={atStart}
		onkeydown={keydown}
		onclick={() => onmove(shiftWindow(viewport, bounds, { months: -12 }))}
	>
		<ChevronLeft class="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
	</button>
	<span
		class="whitespace-nowrap font-mono text-xs tabular-nums text-dark-grey"
		data-testid="comparison-window"
		aria-live="polite">{formatDailyWindow(viewport)}</span
	>
	<button
		type="button"
		class={button}
		aria-label="Next year"
		aria-keyshortcuts="ArrowRight Shift+ArrowRight Meta+ArrowRight Home End"
		disabled={atLatest}
		onkeydown={keydown}
		onclick={() => onmove(shiftWindow(viewport, bounds, { months: 12 }))}
	>
		<ChevronRight class="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
	</button>
	{#if !atLatest}
		<button
			type="button"
			class="rounded-lg border border-mid-warm-grey px-4 py-2 text-xs font-medium hover:bg-warm-grey"
			onclick={() => onmove(windowEndingAt(bounds.end, bounds))}>Latest</button
		>
	{/if}
</div>
