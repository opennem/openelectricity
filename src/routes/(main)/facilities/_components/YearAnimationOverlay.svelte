<script>
	import { onDestroy } from 'svelte';
	import { Play, X } from '@lucide/svelte';
	import AnimationTimeline from '$lib/components/playback/AnimationTimeline.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import clamp from '$lib/utils/clamp.js';
	import formatValue from '../_utils/format-value';
	import { CAPACITY_TOOLTIP } from '../_utils/capacity-tooltip.js';

	/**
	 * The map's year animation ("play mode"): a collapsed Play pill that expands
	 * into a card with a year readout and the shared playback timeline. Owns the
	 * playback engine — a 200ms interval stepping the playhead one year per tick.
	 * The parent owns `active` (it also dims the filter bar and fetches the full
	 * dataset on open) and binds `playYear`/`isPlaying`.
	 *
	 * @type {{
	 *   minYear: number,
	 *   maxYear: number,
	 *   active?: boolean,
	 *   playYear?: number | null,
	 *   isPlaying?: boolean,
	 *   loading?: boolean,
	 *   error?: boolean,
	 *   capacitySeries?: number[],
	 *   onopen?: () => void,
	 *   onclose?: (restore: boolean) => void
	 * }}
	 */
	let {
		minYear,
		maxYear,
		active = false,
		playYear = $bindable(null),
		isPlaying = $bindable(false),
		loading = false,
		error = false,
		capacitySeries = [],
		onopen,
		onclose
	} = $props();

	/** @type {ReturnType<typeof setInterval> | null} */
	let playInterval = null;
	// Set when the pill is clicked, consumed once the dataset is ready — so
	// playback auto-starts after the fetch lands (immediately when cached).
	let pendingPlay = $state(false);

	function start() {
		if (isPlaying || maxYear <= minYear) return;
		// Resume from the paused year; restart from the beginning when the
		// playhead is unset or already at the end.
		playYear = playYear !== null && playYear < maxYear ? playYear : minYear;
		isPlaying = true;
		playInterval = setInterval(() => {
			const nextYear = (playYear ?? minYear) + 1;
			if (nextYear > maxYear) {
				playYear = maxYear;
				pause();
				return;
			}
			playYear = nextYear;
		}, 200);
	}

	function pause() {
		isPlaying = false;
		if (playInterval) {
			clearInterval(playInterval);
			playInterval = null;
		}
	}

	function stop() {
		pause();
		pendingPlay = false;
		playYear = null;
	}

	function toggle() {
		if (isPlaying) pause();
		else start();
	}

	function handleOpen() {
		pendingPlay = true;
		onopen?.();
	}

	/** @param {number} value */
	function handleScrub(value) {
		playYear = clamp(Math.round(value), minYear, maxYear);
	}

	// Total connected capacity (MW) at the playhead year, from the per-year
	// series computed off the full dataset.
	const currentCapacity = $derived(capacitySeries[(playYear ?? minYear) - minYear] ?? null);

	// The timeline runs past today (committed facilities appear at expected
	// operation dates), so the current year gets a red mark on the track,
	// explained in the card footer.
	const currentYear = new Date().getFullYear();

	// One tick per decade, plus the range ends so the start and end years are
	// always marked on the track.
	const timelineTicks = $derived.by(() => {
		const ticks = new Set([minYear, maxYear]);
		for (let year = Math.ceil(minYear / 10) * 10; year <= maxYear; year += 10) {
			ticks.add(year);
		}
		return [...ticks].sort((a, b) => a - b);
	});

	// `active` is the single source of truth for the engine: the parent turning
	// it off (X close via onclose, or a navigation) stops playback and resets
	// the playhead — no imperative control surface needed.
	$effect(() => {
		if (!active) {
			stop();
			return;
		}
		if (pendingPlay && !loading && !error) {
			pendingPlay = false;
			start();
		}
	});

	onDestroy(pause);
</script>

{#if active}
	<div
		class="absolute top-3 left-4 z-20 w-[400px] bg-white rounded-xl border-2 border-warm-grey shadow-lg hidden tablet:flex flex-col overflow-hidden"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between gap-2 px-4 py-3 border-b border-warm-grey bg-light-warm-grey"
		>
			<h3 class="text-sm font-semibold text-dark-grey leading-none mb-0">Facilities connected</h3>
			<!-- Same close-pill design as the facility detail panel's action bar. -->
			<button
				onclick={() => onclose?.(true)}
				class="shrink-0 p-1.5 rounded-full transition-colors cursor-pointer bg-black/10 text-black/60 hover:bg-black/20 hover:text-black"
				title="Close"
				aria-label="Close year animation"
			>
				<X size={16} />
			</button>
		</div>

		{#if error}
			<p class="px-4 py-4 text-xs text-red leading-tight mb-0">
				Couldn't load facilities — close and reopen to retry.
			</p>
		{:else if loading}
			<p class="px-4 py-4 text-xs text-mid-grey leading-tight mb-0 animate-pulse">
				Loading facilities…
			</p>
		{:else}
			<!-- Body -->
			<div class="flex flex-col gap-3 px-4 py-4">
				<div class="flex items-end justify-between gap-4">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-mid-grey leading-none">Year</span>
						<span class="font-mono tabular-nums text-3xl font-semibold text-dark-grey leading-none">
							{playYear ?? minYear}
						</span>
					</div>
					<div class="flex flex-col items-end gap-1">
						<Tooltip
							text={CAPACITY_TOOLTIP.text}
							learnMoreHref={CAPACITY_TOOLTIP.learnMoreHref}
							class="cursor-help"
						>
							<span class="text-xs text-mid-grey leading-none">Capacity</span>
						</Tooltip>
						<span class="font-mono tabular-nums text-3xl font-semibold text-dark-grey leading-none">
							{currentCapacity !== null ? formatValue(currentCapacity) : '—'}<span
								class="ml-1 text-xs font-normal text-mid-grey">MW</span
							>
						</span>
					</div>
				</div>

				<AnimationTimeline
					value={playYear ?? minYear}
					min={minYear}
					max={maxYear}
					{isPlaying}
					disabled={maxYear <= minYear}
					ticks={timelineTicks}
					startLabel={String(minYear)}
					endLabel={String(maxYear)}
					labelClass="text-xs"
					valueText={String(playYear ?? minYear)}
					ariaLabel="Year animation timeline"
					markValue={currentYear}
					ontoggle={toggle}
					onscrubstart={pause}
					onscrub={handleScrub}
				/>
			</div>

			<!-- Footer: notes -->
			<div class="flex flex-col gap-1.5 px-4 py-3 border-t border-warm-grey bg-light-warm-grey">
				<p class="flex items-start gap-1.5 text-[10px] text-mid-grey leading-tight mb-0">
					<span
						class="inline-block size-1 rounded-full bg-mid-grey shrink-0 mt-1"
						aria-hidden="true"
					></span>
					Retired facilities are removed from their closure year.
				</p>
				<p class="flex items-start gap-1.5 text-[10px] text-mid-grey leading-tight mb-0">
					<span
						class="inline-block size-1 rounded-full bg-mid-grey shrink-0 mt-1"
						aria-hidden="true"
					></span>
					Future capacity includes committed facilities by expected operation date.
				</p>
				<p class="flex items-center gap-1.5 text-[10px] text-mid-grey leading-tight mb-0">
					<span class="inline-block w-1 h-2.5 bg-red shrink-0" aria-hidden="true"></span>
					{currentYear}
				</p>
			</div>
		{/if}
	</div>
{:else}
	<button
		onclick={handleOpen}
		class="absolute top-3 left-4 z-20 bg-white rounded-lg px-3 py-2 text-xs font-medium hidden tablet:flex items-center gap-2 hover:bg-light-warm-grey transition-colors border-2 border-warm-grey cursor-pointer"
		title="Play year animation"
	>
		<Play class="size-4 text-mid-grey" />
		<span>Play</span>
	</button>
{/if}
