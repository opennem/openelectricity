<script>
	/**
	 * ChartPanZoomHint — the tap-to-engage control, styled on the chart-toolbar
	 * chip language (see ChartRangeBar): idle it's a raised rest chip that
	 * engages pan/zoom ("Enable pan and zoom" → `onengage`); engaged it flips
	 * to the dark selected-chip treatment and reads "Done" (→ `onexit`).
	 *
	 * Positioning and reveal are the host's job: StratumChart overlays it on
	 * the chart area for the standalone case; hosts stacking several
	 * StratumCharts behind one engagement flag disable the built-in hints
	 * (`showPanZoomHint={false}`) and render this once above the first chart,
	 * so the control doesn't duplicate per chart.
	 *
	 * @typedef {Object} Props
	 * @property {boolean} [engaged] - Engagement state: picks the exit copy over the enable copy
	 * @property {(() => void)} [onengage] - Engage pan/zoom; called when the idle chip is clicked
	 * @property {(() => void)} [onexit] - Disengage pan/zoom; called when the engaged chip is clicked
	 * @property {boolean} [raised] - Rest state renders as a raised white chip instead of a grey one — for floating over chart colours (same convention as ChartRangeBar). Default false.
	 * @property {string} [class] - Extra classes (positioning, hover-reveal) from the host
	 */

	/** @type {Props} */
	let {
		engaged = false,
		onengage = undefined,
		onexit = undefined,
		raised = false,
		class: className = ''
	} = $props();

	let restClass = $derived(
		raised ? 'border-warm-grey bg-white shadow-xs' : 'border-mid-warm-grey bg-light-warm-grey'
	);
</script>

<button
	type="button"
	class="inline-flex items-center rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer {engaged
		? 'border-dark-grey bg-dark-grey text-white hover:bg-black'
		: `${restClass} text-mid-grey hover:text-black`} {className}"
	onclick={engaged ? onexit : onengage}
>
	{engaged ? 'Done' : 'Enable pan and zoom'}
</button>
