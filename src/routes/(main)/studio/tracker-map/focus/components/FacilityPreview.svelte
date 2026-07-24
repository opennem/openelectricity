<script>
	/**
	 * Facility-level dock preview — a compact identity card, not a chart stack.
	 *
	 * Lazily fetches `/api/facility/[code]` (the complete facility, every unit)
	 * when the focused code changes, showing a skeleton meanwhile. Deliberately
	 * chartless: the full facility page owns the charts; this card links out.
	 * `onloaded` reports the fetched facility up so the page can resolve the
	 * breadcrumb label and the map camera for deep-linked facilities.
	 */
	import { fuelTechName } from '$lib/fuel_techs.js';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display.js';
	import { getFacilityCapacity } from '$lib/facilities/units.js';
	import { regionsWithLabels } from '$lib/regions.js';

	/**
	 * @type {{
	 *   code: string,
	 *   regionCode: string,
	 *   onloaded?: (facility: any) => void
	 * }}
	 */
	let { code, regionCode, onloaded = undefined } = $props();

	/** @type {any} */
	let facility = $state.raw(null);
	let failed = $state(false);

	// Fetch is a genuine side effect keyed on the focused code; the cleanup
	// aborts a stale request when the focus moves on mid-flight.
	$effect(() => {
		const currentCode = code;
		facility = null;
		failed = false;
		if (!currentCode) return;

		const controller = new AbortController();
		fetch(`/api/facility/${encodeURIComponent(currentCode)}`, { signal: controller.signal })
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (controller.signal.aborted) return;
				facility = json;
				if (json) onloaded?.(json);
				else failed = true;
			})
			.catch((e) => {
				if (e?.name !== 'AbortError') failed = true;
			});

		return () => controller.abort();
	});

	const capacityFormat = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });

	let fuelTechChips = $derived.by(() => {
		/** @type {Record<string, number>} */
		const counts = {};
		for (const unit of facility?.units ?? []) {
			if (unit.fueltech_id) counts[unit.fueltech_id] = (counts[unit.fueltech_id] ?? 0) + 1;
		}
		return Object.entries(counts).map(([ft, unitCount]) => ({
			ft,
			unitCount,
			label: fuelTechName(/** @type {any} */ (ft)),
			colour: getFueltechColor(ft),
			darkText: needsDarkText(ft)
		}));
	});

	let capacityMW = $derived(facility ? getFacilityCapacity(facility) : 0);
	let regionLabel = $derived(regionsWithLabels[regionCode.toLowerCase()] ?? regionCode);
</script>

<div class="rounded-lg border border-warm-grey bg-white p-4">
	{#if facility}
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h3 class="m-0 text-base leading-tight font-semibold text-dark-grey">{facility.name}</h3>
				<p class="m-0 mt-0.5 text-xs text-mid-grey">{regionLabel} · {facility.code}</p>
			</div>
			<div class="shrink-0 text-right">
				<div class="font-mono text-base leading-tight text-dark-grey">
					{capacityFormat.format(capacityMW)}
				</div>
				<div class="text-[10px] tracking-wide text-mid-grey uppercase">MW capacity</div>
			</div>
		</div>

		{#if fuelTechChips.length}
			<div class="mt-3 flex flex-wrap gap-1.5">
				{#each fuelTechChips as chip (chip.ft)}
					<span
						class="rounded-full border border-black/10 px-2 py-0.5 text-[11px] leading-tight font-medium"
						style:background-color={chip.colour}
						style:color={chip.darkText ? '#222222' : '#ffffff'}
						title="{chip.unitCount} unit{chip.unitCount === 1 ? '' : 's'}"
					>
						{chip.label}{chip.unitCount > 1 ? ` × ${chip.unitCount}` : ''}
					</span>
				{/each}
			</div>
		{/if}

		<a
			href="/facility/{facility.code}"
			class="mt-4 flex items-center justify-center gap-1 rounded-lg bg-dark-grey px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
		>
			Full detail →
		</a>

		<p class="m-0 mt-3 text-[11px] leading-snug text-mid-grey">
			Charts for this facility live on its full detail page — the focus stack keeps the map and the
			region context in view.
		</p>
	{:else if failed}
		<p class="m-0 text-sm text-mid-grey">
			Couldn't load facility <span class="font-mono">{code}</span>.
		</p>
	{:else}
		<!-- Loading skeleton -->
		<div class="animate-pulse">
			<div class="h-4 w-2/3 rounded bg-light-warm-grey"></div>
			<div class="mt-2 h-3 w-1/3 rounded bg-light-warm-grey"></div>
			<div class="mt-4 flex gap-1.5">
				<div class="h-5 w-20 rounded-full bg-light-warm-grey"></div>
				<div class="h-5 w-16 rounded-full bg-light-warm-grey"></div>
			</div>
			<div class="mt-4 h-9 w-full rounded-lg bg-light-warm-grey"></div>
		</div>
	{/if}
</div>
