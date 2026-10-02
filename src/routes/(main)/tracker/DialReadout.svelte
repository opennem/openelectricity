<script>
	import { dialUnit, dialValue } from './dial.js';

	/**
	 * DialReadout — the radial charts' hover readout, in the style of the
	 * scenarios' mini charts: a light band flush with its card's edges, the
	 * hovered time (`label`) on the left a step smaller than the value and
	 * unit on the right (dollars as "$43.17/MWh"; see `dialValue`), with an
	 * optional `note` after the unit ("net").
	 * Idle (`label` null) the band stays reserved but blank, so the dial
	 * below never jumps. `large` reads a step bigger (the lightbox).
	 *
	 * @type {{
	 *   label: string | null,
	 *   value: number | null,
	 *   unit: string,
	 *   note?: string,
	 *   large?: boolean
	 * }}
	 */
	let { label, value, unit, note = '', large = false } = $props();

	let shown = $derived(value === null ? null : dialValue(value, unit));
	/** What follows the value: a per-quantity unit ("/MWh") joins it; other
	 *  units, and the note, follow a real space, so the text reads as it looks. */
	let suffix = $derived.by(() => {
		const tail = dialUnit(unit);
		const unitText = !tail || tail.startsWith('/') ? tail : ` ${tail}`;
		return note ? `${unitText} ${note}` : unitText;
	});
</script>

<div data-testid="dial-readout" class="h-[28px]">
	{#if label}
		<div
			class="flex h-full items-baseline justify-between gap-4 whitespace-nowrap bg-light-warm-grey px-6 pt-[5px] {large
				? 'text-base'
				: 'text-sm'}"
		>
			<span class="text-mid-grey {large ? 'text-sm' : 'text-xs'}">{label}</span>
			<span>
				<strong class="font-semibold text-dark-grey">{shown?.value ?? '—'}</strong><span
					class="text-mid-grey">{suffix}</span
				>
			</span>
		</div>
	{/if}
</div>
