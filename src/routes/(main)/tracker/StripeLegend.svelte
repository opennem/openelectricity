<script>
	import { formatComparisonValue } from './comparison-metrics.js';
	import { stripeGradient, stripeKeys } from './comparison-stripes.js';

	/**
	 * StripeLegend — a heatmap card's colour key: the ramp (or the price
	 * stops) between its end labels and unit, then the zero and no-data cells.
	 * Hovering reads it out: along a ramp, a marker and the value at that point
	 * (ramps are linear in their domain, as `stripeGradient` draws them); on a
	 * price stop, its value; on a key, what it stands for. The readout is
	 * fixed-positioned so the card's clipping cannot cut it off.
	 *
	 * @type {{ scale: import('./comparison-stripes.js').StripeScale, metric: string }}
	 */
	let { scale, metric } = $props();

	/** @type {{ x: number, y: number, text: string, colour: string, marker?: number } | null} */
	let readout = $state(null);

	/** @param {number} value */
	const valueText = (value) => `${formatComparisonValue(value, metric)} ${scale.unit}`;

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event */
	function trackRamp(event) {
		const rect = event.currentTarget.getBoundingClientRect();
		const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
		const min = scale.domain[0];
		const value = min + fraction * (scale.domain[scale.domain.length - 1] - min);
		readout = {
			x: event.clientX,
			y: rect.top,
			text: valueText(value),
			colour: scale.colour(value),
			marker: fraction * rect.width
		};
	}

	/** @param {PointerEvent & { currentTarget: HTMLElement }} event @param {string} text @param {string} colour */
	function showAt(event, text, colour) {
		const rect = event.currentTarget.getBoundingClientRect();
		readout = { x: rect.left + rect.width / 2, y: rect.top, text, colour };
	}

	const clear = () => (readout = null);
</script>

<!-- Hover readouts are a pointer-only extra: the aria-label describes the scale. -->
<div
	class="flex items-center gap-2 font-mono text-xxs text-mid-grey"
	role="img"
	aria-label={`Colour scale from ${scale.labels[0]} to ${scale.labels[scale.labels.length - 1]} ${scale.unit}, with the colours for zero and for no data`}
	data-testid="stripes-legend"
>
	<span>{scale.labels[0]}</span>
	{#if scale.kind === 'swatch'}
		<span class="flex h-[18px] overflow-hidden rounded">
			{#each scale.colours as colour, index (colour)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="block h-[18px] w-3 cursor-crosshair"
					style:background-color={colour}
					data-testid="stripes-legend-stop"
					onpointerenter={(event) => showAt(event, valueText(scale.domain[index]), colour)}
					onpointerleave={clear}
				></span>
			{/each}
		</span>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="relative block h-[18px] w-24 cursor-crosshair rounded"
			style:background={stripeGradient(scale)}
			data-testid="stripes-legend-ramp"
			onpointermove={trackRamp}
			onpointerleave={clear}
		>
			{#if readout?.marker !== undefined}
				<span
					class="pointer-events-none absolute inset-y-0 w-px bg-dark-grey"
					style:left={`${readout.marker}px`}
				></span>
			{/if}
		</span>
	{/if}
	<span>{scale.labels[scale.labels.length - 1]}</span>
	<span class="text-mid-warm-grey">{scale.unit}</span>
	{#each stripeKeys(scale) as key (key.label)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="flex items-center gap-1"
			onpointerenter={(event) =>
				showAt(event, key.label === '0' ? valueText(0) : 'No data for the period', key.colour)}
			onpointerleave={clear}
		>
			<span
				class="block size-[18px] rounded border border-mid-warm-grey"
				style:background-color={key.colour}
			></span>{key.label}
		</span>
	{/each}
</div>

{#if readout}
	<div
		class="pointer-events-none fixed z-[9999] flex -translate-x-1/2 -translate-y-full items-center gap-2 whitespace-nowrap rounded-lg bg-dark-grey px-3 py-2 font-space text-xs text-white shadow"
		style:left={`${readout.x}px`}
		style:top={`${readout.y - 6}px`}
		role="status"
		data-testid="stripes-legend-readout"
	>
		<span
			class="block size-3 rounded-sm border border-white/40"
			style:background-color={readout.colour}
		></span>
		{readout.text}
	</div>
{/if}
