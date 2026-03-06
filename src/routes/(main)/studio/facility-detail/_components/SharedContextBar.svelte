<script>
	/**
	 * SharedContextBar -- displays shared context info for all fuel tech types
	 * in a horizontal bar: network region, commissioning date, MLF, total capacity.
	 */

	/**
	 * @type {{
	 *   facility: { network_region?: string, units?: Array<{ capacity_registered?: number, data_first_seen?: string, marginal_loss_factor?: number }> },
	 *   sanityFacility?: { units?: Array<{ commencement_date?: string, marginal_loss_factor?: number, capacity_registered?: number }> } | null
	 * }}
	 */
	let { facility, sanityFacility = null } = $props();

	/**
	 * Earliest commissioning year -- prefer Sanity `commencement_date`, fall back to
	 * OE API `data_first_seen`.
	 */
	let commissionedYear = $derived.by(() => {
		/** @type {string | null} */
		let earliest = null;

		// Try Sanity units first
		if (sanityFacility?.units?.length) {
			for (const unit of sanityFacility.units) {
				const d = unit.commencement_date;
				if (d && (!earliest || d < earliest)) earliest = d;
			}
		}

		// Fall back to OE API data_first_seen
		if (!earliest && facility?.units?.length) {
			for (const unit of facility.units) {
				const d = unit.data_first_seen;
				if (d && (!earliest || d < earliest)) earliest = d;
			}
		}

		if (!earliest) return null;
		return earliest.slice(0, 4);
	});

	/**
	 * Capacity-weighted average MLF from Sanity units.
	 * Only computed when at least one unit has both MLF and capacity.
	 */
	let mlf = $derived.by(() => {
		const units = sanityFacility?.units;
		if (!units?.length) return null;

		let totalWeight = 0;
		let weightedSum = 0;

		for (const unit of units) {
			const factor = unit.marginal_loss_factor;
			const cap = unit.capacity_registered;
			if (factor != null && cap != null && cap > 0) {
				weightedSum += factor * cap;
				totalWeight += cap;
			}
		}

		if (totalWeight === 0) return null;
		return weightedSum / totalWeight;
	});

	/**
	 * MLF colour indicator:
	 *   green  > 0.95
	 *   amber  0.90 -- 0.95
	 *   red    < 0.90
	 * @param {number} value
	 * @returns {string}
	 */
	function mlfColourClass(value) {
		if (value > 0.95) return 'text-green-700 bg-green-50';
		if (value >= 0.9) return 'text-amber-700 bg-amber-50';
		return 'text-red-700 bg-red-50';
	}

	/**
	 * Total registered capacity across all facility units (MW).
	 */
	let totalCapacity = $derived.by(() => {
		if (!facility?.units?.length) return null;

		let sum = 0;
		let hasAny = false;
		for (const unit of facility.units) {
			if (unit.capacity_registered != null) {
				sum += unit.capacity_registered;
				hasAny = true;
			}
		}
		return hasAny ? sum : null;
	});

	/**
	 * Format capacity for display.
	 * @param {number} val
	 * @returns {string}
	 */
	function fmtCapacity(val) {
		return val.toLocaleString('en-AU', { maximumFractionDigits: 1 });
	}
</script>

<div class="flex items-center gap-2 flex-wrap">
	<!-- Network region badge -->
	{#if facility?.network_region}
		<span
			class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium text-dark-grey bg-light-warm-grey"
		>
			{facility.network_region}
		</span>
	{/if}

	<!-- Commissioned year -->
	{#if commissionedYear}
		<span class="text-[11px] text-mid-grey">
			Commissioned {commissionedYear}
		</span>
	{/if}

	<!-- MLF -->
	{#if mlf != null}
		<span
			class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium {mlfColourClass(mlf)}"
		>
			MLF {mlf.toFixed(2)}
		</span>
	{/if}

	<!-- Total capacity -->
	{#if totalCapacity != null}
		<span class="text-[11px] text-mid-grey font-mono tabular-nums">
			{fmtCapacity(totalCapacity)} MW
		</span>
	{/if}
</div>
