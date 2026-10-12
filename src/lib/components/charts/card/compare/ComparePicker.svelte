<script>
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { COMPARE_SLOTS } from './chart-compare.js';

	/**
	 * ComparePicker — the A / B bar at the top of a compare panel: a pill per
	 * slot (its letter, the bucket it holds and ‹ › steppers), a swap button
	 * and a hint naming the slot the next click on the chart sets.
	 *
	 * The armed slot has a dark border; pressing a pill arms it. Focused on a
	 * pill, ← / → step its bucket (Shift steps ten). A slot whose bucket the
	 * chart can't read reads "not in view" with the fixes it has: bring it
	 * back into the chart (`onreveal`) or move to the nearest bucket.
	 *
	 * @type {{
	 *   pair: import('./chart-compare.js').ComparePair,
	 *   armed: import('./chart-compare.js').CompareSlot,
	 *   states: Record<import('./chart-compare.js').CompareSlot, 'ok' | 'unset' | 'missing'>,
	 *   times: number[],
	 *   formatTime: (time: number) => string,
	 *   disabled?: boolean,
	 *   onarm: (slot: import('./chart-compare.js').CompareSlot) => void,
	 *   onstep: (slot: import('./chart-compare.js').CompareSlot, steps: number) => void,
	 *   onswap: () => void,
	 *   onnearest: (slot: import('./chart-compare.js').CompareSlot) => void,
	 *   onreveal?: () => void
	 * }}
	 */
	let {
		pair,
		armed,
		states,
		times,
		formatTime,
		disabled = false,
		onarm,
		onstep,
		onswap,
		onnearest,
		onreveal
	} = $props();

	let missing = $derived(COMPARE_SLOTS.filter((slot) => states[slot] === 'missing'));

	/** @param {import('./chart-compare.js').CompareSlot} slot */
	function slotLabel(slot) {
		const time = pair[slot];
		if (time === null) return 'Click the chart';
		return formatTime(time);
	}

	/** @param {import('./chart-compare.js').CompareSlot} slot @param {KeyboardEvent} event */
	function keydown(slot, event) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		onstep(slot, (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 10 : 1));
	}

	/** @param {import('./chart-compare.js').CompareSlot} slot @param {number} direction */
	function atEnd(slot, direction) {
		const time = pair[slot];
		if (!times.length) return true;
		if (time === null) return false;
		return direction < 0 ? time <= times[0] : time >= /** @type {number} */ (times.at(-1));
	}

	const STEP =
		'inline-flex h-full w-[22px] shrink-0 items-center justify-center text-mid-grey transition-colors hover:text-dark-grey disabled:cursor-not-allowed disabled:text-mid-warm-grey';
</script>

<div class="flex flex-wrap items-center gap-x-2 gap-y-2" data-png-exclude>
	{#each COMPARE_SLOTS as slot, index (slot)}
		{@const letter = slot.toUpperCase()}
		{#if index}
			<ArrowRight class="size-3.5 shrink-0 text-mid-grey" aria-hidden="true" />
		{/if}
		<div
			role="group"
			aria-label="Date {letter}"
			data-testid="compare-slot-{slot}"
			class="inline-flex h-[28px] min-w-0 items-stretch overflow-hidden rounded-md border text-xs transition-colors {armed ===
			slot
				? 'border-dark-grey bg-white'
				: 'border-mid-warm-grey/40 bg-light-warm-grey'} {states[slot] === 'missing'
				? 'border-dashed'
				: ''}"
		>
			<button
				type="button"
				class="flex min-w-0 items-center gap-2 pl-1 pr-1.5"
				aria-pressed={armed === slot}
				aria-label="Date {letter}: {slotLabel(slot)}{states[slot] === 'missing'
					? ', not in view'
					: ''}. Press to set it from the chart; left and right arrows step it."
				{disabled}
				onclick={() => onarm(slot)}
				onkeydown={(event) => keydown(slot, event)}
			>
				<span
					class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-[3px] bg-dark-grey text-xxs font-semibold leading-none text-white"
					aria-hidden="true">{letter}</span
				>
				<span
					class="truncate font-mono tabular-nums {pair[slot] === null
						? 'text-mid-grey'
						: 'text-dark-grey'}">{slotLabel(slot)}</span
				>
				{#if states[slot] === 'missing'}
					<span class="whitespace-nowrap text-xxs text-mid-grey">not in view</span>
				{/if}
			</button>
			<span class="my-1.5 w-px bg-mid-warm-grey/40" aria-hidden="true"></span>
			<button
				type="button"
				class={STEP}
				aria-label="Previous interval for {letter}"
				disabled={disabled || atEnd(slot, -1)}
				onclick={() => onstep(slot, -1)}
			>
				<ChevronLeft class="size-3.5" aria-hidden="true" />
			</button>
			<button
				type="button"
				class={STEP}
				aria-label="Next interval for {letter}"
				disabled={disabled || atEnd(slot, 1)}
				onclick={() => onstep(slot, 1)}
			>
				<ChevronRight class="size-3.5" aria-hidden="true" />
			</button>
		</div>
	{/each}

	<Tooltip text="Swap A and B" class="inline-flex">
		<button
			type="button"
			class="inline-flex size-[28px] shrink-0 items-center justify-center rounded-md text-mid-grey transition-colors hover:bg-warm-grey hover:text-dark-grey disabled:cursor-not-allowed disabled:text-mid-warm-grey disabled:hover:bg-transparent"
			aria-label="Swap A and B"
			disabled={disabled || pair.a === null || pair.b === null}
			onclick={onswap}
		>
			<ArrowLeftRight class="size-[15px]" aria-hidden="true" />
		</button>
	</Tooltip>

	{#if missing.length}
		<span class="flex flex-wrap items-center gap-x-2 text-xs">
			{#if onreveal}
				<button
					type="button"
					class="rounded-md px-1.5 py-1 font-medium text-dark-grey underline decoration-mid-warm-grey underline-offset-2 hover:decoration-dark-grey"
					onclick={onreveal}>Show in chart</button
				>
			{/if}
			<button
				type="button"
				class="rounded-md px-1.5 py-1 font-medium text-dark-grey underline decoration-mid-warm-grey underline-offset-2 hover:decoration-dark-grey disabled:cursor-not-allowed disabled:text-mid-grey"
				disabled={!times.length}
				onclick={() => missing.forEach(onnearest)}
				>Use nearest {missing.length > 1 ? 'dates' : 'date'}</button
			>
		</span>
	{/if}

	<span class="ml-auto text-xxs text-mid-grey" aria-live="polite">
		Click the chart to set <span class="font-semibold text-dark-grey">{armed.toUpperCase()}</span>
	</span>
</div>
