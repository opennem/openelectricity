<script>
	import { mergeProps } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { fly } from 'svelte/transition';
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
	import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { formatPrice, formatWithUnit, getNumberFormat } from '$lib/utils/formatters';
	import { formatGenerationUnitValue } from '$lib/components/charts/network/generation-units.js';
	import { getTimeFormatPolicy } from '$lib/components/charts/v2/time-format-policy.js';
	import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
	import { buildWindowMetrics } from './window-metrics.js';

	/**
	 * The window-metrics strip: one ticker item per metric reading
	 * "label unit · ↓ minimum · ↑ maximum" on one line, each time in its tooltip. Sits
	 * between the navigation and the charts and scrolls sideways when it
	 * overflows. Hover or focus an extreme to highlight its interval on the
	 * synced charts; click to keep it highlighted, click again to clear.
	 *
	 * `layout="list"` lays the same readings out for a dialog (phones, which
	 * hide the strip): a row per metric with both extremes as large buttons,
	 * each showing its time, since there's no hover to reveal it.
	 *
	 * Picking an extreme also reports it through `onselect` — which metric
	 * and a label naming it, e.g. "Max net power 32.1 GW", for a marker on its
	 * chart — or undefined when the pick is cleared. `onpreview` reports the
	 * hovered or focused extreme the same way, for a preview marker.
	 *
	 * @type {{input: Parameters<typeof buildWindowMetrics>[0], interval: string,
	 * zone: string, generationPrefix: SiPrefix,
	 * status: Record<string, {pending: boolean, error: string | null}>,
	 * onretry: (id: string) => void, onhighlight: (time: number | undefined) => void,
	 * focusTime: number | undefined, onfocuschange: (time: number | undefined) => void,
	 * layout?: 'strip' | 'list',
	 * onselect?: (pick: import('./window-metrics.js').MetricPick | undefined) => void,
	 * onpreview?: (pick: import('./window-metrics.js').MetricPick | undefined) => void}} -
	 * `focusTime` is the pinned time the charts share; an extreme is pressed while it
	 * matches, and clicking one pins or clears it for every surface */
	let {
		input,
		interval,
		zone,
		generationPrefix,
		status,
		onretry,
		onhighlight,
		focusTime,
		onfocuschange,
		layout = 'strip',
		onselect,
		onpreview
	} = $props();
	let groups = $derived(buildWindowMetrics(input));
	let timePolicy = $derived(getTimeFormatPolicy(interval, ianaFromOffset(zone)));
	let formatDate = $derived(timePolicy.formatShort);
	const extrema = /** @type {const} */ (['min', 'max']);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	// 10px rem base: size-6 is 15px, level with the 14px value line.
	// Site red on the light band; the lighter red keeps contrast on a pinned, dark button.
	const extremeIconClass = 'size-5 shrink-0 stroke-[2.5]';
	const integer = getNumberFormat(0);
	const percentage = getNumberFormat(1);
	/** The unit beside the label; percentages are written on the values instead.
	 * @param {{id: string, unit: string}} group */
	function unitFor(group) {
		if (group.unit === '%') return '';
		if (group.id === 'generation') return `${generationPrefix}W`;
		if (group.id === 'energy') return `${generationPrefix}Wh`;
		return group.id === 'demand' || group.id.startsWith('curtailment_')
			? `${generationPrefix}${input.basis === 'energy' ? 'Wh' : 'W'}`
			: group.unit;
	}
	/** @param {number} value @param {string} id */
	function formatValue(value, id) {
		if (id === 'generation' || id === 'energy' || id === 'demand' || id.startsWith('curtailment_'))
			return formatGenerationUnitValue(value, 'M', generationPrefix);
		if (id === 'renewables') return `${percentage.format(value)}%`;
		if (id !== 'market') return integer.format(value);
		// Dollar values lead with $; the label's unit carries the rate.
		return input.priceMetric === 'market_value'
			? formatWithUnit(integer.format(value), '$')
			: formatPrice(value);
	}
	/** @param {string} id */
	const unitOnValues = (id) =>
		id === 'generation' || id === 'energy' || id === 'demand' || id.startsWith('curtailment_');
	/** A reading as its chart marker names it: "Max net power 32.1 GW".
	 * @param {ReturnType<typeof buildWindowMetrics>[number]} group
	 * @param {'min' | 'max'} kind
	 * @param {{time: number, value: number}} point
	 * @returns {import('./window-metrics.js').MetricPick} */
	function pickOf(group, kind, point) {
		const unit = unitFor(group);
		const value = formatValue(point.value, group.id);
		// A price already leads with $; its rate unit follows it ("$85/MWh").
		const withUnit = !unit
			? value
			: group.id === 'market'
				? `${value}${unit.replace(/^\$/, '')}`
				: `${value} ${unit}`;
		return {
			id: group.id,
			time: point.time,
			label: `${kind === 'min' ? 'Min' : 'Max'} ${group.label.toLowerCase()} ${withUnit}`
		};
	}
	/** Pin or clear an extreme for every surface, reporting the pick.
	 * @param {ReturnType<typeof buildWindowMetrics>[number]} group
	 * @param {'min' | 'max'} kind @param {boolean} active */
	function choose(group, kind, active) {
		const point = group[kind];
		const pick = active || !point ? undefined : pickOf(group, kind, point);
		onfocuschange(pick?.time);
		onselect?.(pick);
		preview(undefined);
	}
	/** Highlight an extreme's interval on the charts, and preview its marker.
	 * @param {ReturnType<typeof buildWindowMetrics>[number] | undefined} group
	 * @param {'min' | 'max'} [kind] */
	function preview(group, kind = 'min') {
		const point = group?.[kind];
		onhighlight(point?.time);
		onpreview?.(group && point ? pickOf(group, kind, point) : undefined);
	}
	/** @param {{error: string | null, pending: boolean}} state
	 * @param {ReturnType<typeof buildWindowMetrics>[number]} group @param {unknown} point */
	function noticeFor(state, group, point) {
		if (state.error)
			return group.id !== 'generation' && group.id !== 'energy' && group.id !== 'market'
				? `Unavailable — retry ${group.label.toLowerCase()}`
				: 'Unavailable — retry the chart';
		return state.pending || point ? '' : 'No complete intervals';
	}
</script>

{#if layout === 'list'}
	<ul class="divide-y divide-warm-grey" aria-label="Window metrics">
		{#each groups as group (group.id)}
			{@const state = status[group.id]}
			{@const ready = !state.pending && !state.error}
			{@const unit = unitFor(group)}
			<li
				class="py-4 first:pt-0"
				data-testid={`metrics-list-${group.id}`}
				aria-busy={state.pending}
			>
				<div
					class="flex items-baseline gap-2 font-space text-xs font-semibold uppercase tracking-wider text-dark-grey"
				>
					{group.label}
					{#if unit}<span class="font-mono font-normal normal-case tracking-normal text-mid-grey"
							>{unit}</span
						>{/if}
				</div>
				<div class="mt-2 grid grid-cols-2 gap-2">
					{#each extrema as kind (kind)}
						{@const point = group[kind]}
						{@const active = !!point && point.time === focusTime}
						{@const notice = noticeFor(state, group, point)}
						<button
							type="button"
							class="flex min-h-[56px] flex-col items-start justify-center gap-1 rounded-[10px] border px-4 py-2 text-left transition-colors disabled:cursor-default {active
								? 'border-dark-grey bg-dark-grey text-white'
								: 'border-warm-grey bg-white text-dark-grey'}"
							disabled={!point || !ready}
							aria-pressed={active}
							aria-label={`${kind === 'min' ? 'Minimum' : 'Maximum'} ${group.label.toLowerCase()}`}
							data-testid={`metric-list-${group.id}-${kind}`}
							onclick={() => choose(group, kind, active)}
						>
							<span class="flex items-center gap-1.5">
								{#if kind === 'min'}
									<ArrowDownToLine
										class="{extremeIconClass} {active ? 'text-error-red' : 'text-red'}"
										aria-hidden="true"
									/>
								{:else}
									<ArrowUpToLine
										class="{extremeIconClass} {active ? 'text-error-red' : 'text-red'}"
										aria-hidden="true"
									/>
								{/if}
								<span class="font-mono text-base font-semibold tabular-nums"
									>{point && ready ? formatValue(point.value, group.id) : '--'}</span
								>
								{#if unit && unitOnValues(group.id)}<span class="font-mono text-xxs">{unit}</span
									>{/if}
							</span>
							<span class="text-xs {active ? 'text-mid-warm-grey' : 'text-mid-grey'}"
								>{notice || (point ? timePolicy.formatTooltip(point.time) : 'Loading…')}</span
							>
						</button>
					{/each}
				</div>
				{#if group.id !== 'generation' && group.id !== 'energy' && group.id !== 'market' && state.error}
					<button class="mt-2 text-xs underline" onclick={() => onretry(group.id)}
						>Retry {group.label.toLowerCase()}</button
					>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<section
		aria-label="Window metrics"
		class="axis-ticks-bg shrink-0 border-b border-warm-grey bg-white"
	>
		<div
			class="ticker-scroll flex overflow-x-auto overscroll-x-contain scroll-px-8 divide-x divide-warm-grey"
		>
			{#each groups as group (group.id)}
				{@const state = status[group.id]}
				{@const ready = !state.pending && !state.error}
				{@const unit = unitFor(group)}
				{@const unitOnValues =
					group.id === 'generation' ||
					group.id === 'energy' ||
					group.id === 'demand' ||
					group.id.startsWith('curtailment_')}
				<div
					class="flex shrink-0 items-center gap-x-5 whitespace-nowrap px-8 py-3 last:border-r last:border-warm-grey"
					data-testid={`metrics-${group.id}`}
					aria-busy={state.pending}
				>
					<span
						class="flex items-center gap-x-1.5 font-space text-xxs font-semibold uppercase tracking-wider text-dark-grey"
					>
						<!-- Only a metric with documentation gets a tooltip on its label. -->
						{#if group.docs}
							<Tooltip
								text={group.description}
								learnMoreHref={group.docs.href}
								linkLabel={group.docs.label}
								tapToOpen
								class="cursor-help">{group.label}</Tooltip
							>
						{:else}
							{group.label}
						{/if}
						{#if unit && !unitOnValues}
							<span
								class="font-mono text-xxs font-normal normal-case tracking-normal text-mid-grey"
								data-testid={`metrics-${group.id}-unit`}>{unit}</span
							>
						{/if}
					</span>
					<span class="flex items-center gap-x-3">
						{#each extrema as kind (kind)}
							{@const point = group[kind]}
							{@const active = !!point && point.time === focusTime}
							{@const label = `${kind === 'min' ? 'Minimum' : 'Maximum'} ${group.label.toLowerCase()}`}
							{@const notice = state.error
								? group.id !== 'generation' && group.id !== 'energy' && group.id !== 'market'
									? `Unavailable — retry ${group.label.toLowerCase()}`
									: 'Unavailable — retry the chart'
								: state.pending || point
									? ''
									: 'No complete intervals'}
							<!-- The tooltip is just the time; the button's aria-label carries the full name. -->
							<Tooltip
								text={point
									? `${kind === 'min' ? 'Min' : 'Max'}: ${formatDate(point.time)}`
									: label}
							>
								{#snippet trigger({ props })}
									<button
										{...mergeProps(props, {
											onmouseenter: () => preview(group, kind),
											onmouseleave: () => preview(undefined),
											onfocus: () => preview(group, kind),
											onblur: () => preview(undefined),
											onclick: () => choose(group, kind, active)
										})}
										class="touch-hit flex items-center gap-x-1.5 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey {active
											? 'bg-dark-grey'
											: 'enabled:hover:bg-warm-grey'}"
										disabled={!point || !ready}
										data-testid={`metric-${group.id}-${kind}`}
										aria-label={label}
										aria-pressed={active}
									>
										{#if kind === 'min'}
											<ArrowDownToLine
												class="{extremeIconClass} {active ? 'text-error-red' : 'text-red'}"
												aria-hidden="true"
											/>
										{:else}
											<ArrowUpToLine
												class="{extremeIconClass} {active ? 'text-error-red' : 'text-red'}"
												aria-hidden="true"
											/>
										{/if}
										<!-- A fresh value slides in from the left; the placeholder just appears. -->
										{#key point?.value}
											<span
												class="font-mono text-sm font-semibold leading-none tabular-nums {active
													? 'text-white'
													: point && ready
														? 'text-dark-grey'
														: 'text-mid-grey'}"
												in:fly={{ x: point ? -8 : 0, duration: reducedMotion.current ? 0 : 240 }}
												>{point ? formatValue(point.value, group.id) : '--'}</span
											>
										{/key}
										{#if unit && unitOnValues}
											<span
												class="font-mono text-xxs {active ? 'text-mid-warm-grey' : 'text-mid-grey'}"
												data-testid={kind === 'min' ? `metrics-${group.id}-unit` : undefined}
												>{unit}</span
											>
										{/if}
										{#if notice}
											<span class="text-xxs text-mid-grey">{notice}</span>
										{/if}
									</button>
								{/snippet}
							</Tooltip>
						{/each}
					</span>
					{#if group.id !== 'generation' && group.id !== 'energy' && group.id !== 'market' && state.error}
						<button class="text-xs underline" onclick={() => onretry(group.id)}
							>Retry {group.label.toLowerCase()}</button
						>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	/* A ticker: no scrollbar, the edges fade to hint at the overflow. */
	.ticker-scroll {
		-ms-overflow-style: none;
		scrollbar-width: none;
		mask-image: linear-gradient(
			to right,
			transparent,
			#000 2rem,
			#000 calc(100% - 2rem),
			transparent
		);
	}
	.ticker-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
