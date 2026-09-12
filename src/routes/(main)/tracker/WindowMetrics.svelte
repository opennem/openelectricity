<script>
	import { mergeProps } from 'bits-ui';
	import PanelToggle from './PanelToggle.svelte';
	import MetricCard from '$lib/components/charts/facility/metrics/MetricCard.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { formatGenerationUnitValue } from '$lib/components/charts/network/generation-units.js';
	import { getTimeFormatPolicy } from '$lib/components/charts/v2/time-format-policy.js';
	import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
	import { buildWindowMetrics } from './window-metrics.js';

	/** @type {{input: Parameters<typeof buildWindowMetrics>[0], interval: string,
	 * zone: string, generationPrefix: SiPrefix,
	 * status: Record<string, {pending: boolean, error: string | null}>,
	 * onretry: (id: string) => void, onhighlight: (time: number | undefined) => void, onclose: () => void}} */
	let { input, interval, zone, generationPrefix, status, onretry, onhighlight, onclose } = $props();
	/** @type {{id: string, kind: 'min' | 'max', time: number, value: number} | null} */
	let selection = $state(null);
	let selected = $derived.by(() => {
		const current = selection;
		if (!current) return null;
		const point = groups.find((group) => group.id === current.id)?.[current.kind];
		return point?.time === current.time && point?.value === current.value ? current : null;
	});
	export function getSelectedTime() {
		return selected?.time;
	}
	let groups = $derived(buildWindowMetrics(input));
	let formatDate = $derived(getTimeFormatPolicy(interval, ianaFromOffset(zone)).formatTooltip);
	const extrema = /** @type {const} */ (['min', 'max']);
	const integer = getNumberFormat(0);
	const decimal = getNumberFormat(2);
	const percentage = getNumberFormat(1);
	/** @param {number} value @param {string} id */
	function formatValue(value, id) {
		if (id === 'generation' || id === 'demand')
			return formatGenerationUnitValue(value, 'M', generationPrefix);
		if (id === 'renewables') return percentage.format(value);
		return id === 'market' && input.priceMetric !== 'market_value'
			? decimal.format(value)
			: integer.format(value);
	}
</script>

<section aria-label="Window metrics" class="min-w-0 bg-white">
	<header
		class="sticky top-0 z-10 flex h-[48px] items-center gap-[10px] border-b border-warm-grey bg-white px-[4px]"
	>
		<h3 class="m-0 min-w-0 flex-1 text-right text-sm font-semibold">Metrics</h3>
		<PanelToggle
			side="left"
			open
			label="Hide metrics"
			controls="tracker-metrics-panel"
			onclick={onclose}
		/>
	</header>
	<div class="-mb-px grid grid-cols-1">
		{#each groups as group (group.id)}
			<div
				class="grid min-w-0 grid-cols-2 border-b border-mid-warm-grey/40"
				data-testid={`metrics-${group.id}`}
				aria-busy={status[group.id].pending}
			>
				<div
					class="col-span-2 flex items-center border-b border-mid-warm-grey/40 bg-light-warm-grey/50 px-4 py-2 text-sm font-semibold text-dark-grey"
				>
					<Tooltip text={group.description} class="cursor-help">
						{group.label}
					</Tooltip>
				</div>
				{#each extrema as kind (kind)}
					{@const point = group[kind]}
					{@const active = selected?.id === group.id && selected.kind === kind}
					{@const label = `${kind === 'min' ? 'Minimum' : 'Maximum'} ${group.label.toLowerCase()}`}
					{@const subtitle = status[group.id].error
						? group.id === 'demand' || group.id === 'renewables'
							? `Unavailable — retry ${group.label.toLowerCase()}`
							: 'Unavailable — retry the chart'
						: status[group.id].pending
							? ''
							: point
								? `${formatDate(point.time)}${point.ties > 1 ? ' · first occurrence' : ''}`
								: 'No complete intervals'}
					<Tooltip text={label}>
						{#snippet trigger({ props })}
							<button
								{...mergeProps(props, {
									onmouseenter: () => onhighlight(point?.time),
									onmouseleave: () => onhighlight(undefined),
									onfocus: () => onhighlight(point?.time),
									onblur: () => onhighlight(undefined),
									onclick: () => {
										selection =
											active || !point
												? null
												: { id: group.id, kind, time: point.time, value: point.value };
										onhighlight(undefined);
									}
								})}
								class="grid min-w-0 grid-cols-[minmax(0,1fr)_30px] items-start gap-x-2 break-words border-mid-warm-grey/40 px-5 py-5 text-left transition-colors enabled:hover:bg-warm-grey {kind ===
								'max'
									? 'border-l'
									: ''} {active
									? 'bg-warm-grey ring-2 ring-inset ring-dark-grey'
									: ''} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
								disabled={!point || status[group.id].pending || !!status[group.id].error}
								data-testid={`metric-${group.id}-${kind}`}
								aria-label={label}
								aria-pressed={active}
							>
								<MetricCard
									size="sm"
									label=""
									value={point ? formatValue(point.value, group.id) : '--'}
									unit={group.id === 'generation' || group.id === 'demand'
										? `${generationPrefix}${input.basis === 'energy' ? 'Wh' : 'W'}`
										: group.unit}
									{subtitle}
								/>
								<span
									class="inline-flex self-start items-center justify-center rounded border py-[2px] text-[10px] font-semibold leading-[14px] transition-colors {active
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-mid-warm-grey bg-light-warm-grey text-mid-grey'}"
									aria-hidden="true">{kind === 'min' ? 'Min' : 'Max'}</span
								>
							</button>
						{/snippet}
					</Tooltip>
				{/each}
				{#if (group.id === 'demand' || group.id === 'renewables') && status[group.id].error}
					<button
						class="col-span-2 px-4 py-2 text-left text-xs underline"
						onclick={() => onretry(group.id)}>Retry {group.label.toLowerCase()}</button
					>
				{/if}
				{#if group.available < group.intervals && !status[group.id].pending && !status[group.id].error}
					<p class="col-span-2 px-4 py-2 text-xxs text-mid-grey">
						{group.label}: {group.available} of {group.intervals} intervals complete.
					</p>
				{/if}
			</div>
		{/each}
	</div>
	<footer
		class="m-4 rounded-md border border-dashed border-mid-warm-grey bg-light-warm-grey px-4 py-3 text-xxs leading-relaxed text-mid-grey"
	>
		Complete intervals only. Values ignore chart transforms. Hover or focus a value to highlight its
		interval. Tap to keep it selected; tap again to clear.
	</footer>
</section>
