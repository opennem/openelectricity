<script>
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import { getFueltechColor } from '$lib/utils/fueltech-display.js';
	import { regions } from '../../../facilities/_utils/filters';
	import { groupUnits } from '../../../facilities/_utils/units';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import { fuelTechName } from '$lib/fuel_techs.js';
	import { getNumberFormat } from '$lib/utils/formatters.js';

	let { data } = $props();

	let facility = $derived(data.facility);
	let unitGroups = $derived(facility ? groupUnits(facility) : []);

	// Fuel tech mix: merge groups by fueltech_id, compute percentages
	let fuelTechMix = $derived.by(() => {
		/** @type {Map<string, { fueltech_id: string, capacity: number, colour: string }>} */
		const merged = new Map();
		for (const g of unitGroups) {
			if (g.totalCapacity <= 0) continue;
			const existing = merged.get(g.fueltech_id);
			if (existing) {
				existing.capacity += g.totalCapacity;
			} else {
				merged.set(g.fueltech_id, {
					fueltech_id: g.fueltech_id,
					capacity: g.totalCapacity,
					colour: g.bgColor
				});
			}
		}
		const groups = Array.from(merged.values()).sort((a, b) => b.capacity - a.capacity);
		const total = groups.reduce((sum, g) => sum + g.capacity, 0);
		if (total <= 0) return [];
		return groups.map((g) => ({
			...g,
			label: fuelTechName(g.fueltech_id),
			pct: (g.capacity / total) * 100
		}));
	});

	let regionLabel = $derived(
		facility
			? regions.find((r) => r.value === facility.network_region?.toLowerCase())?.longLabel ||
					facility.network_id?.toUpperCase() ||
					''
			: ''
	);

	let photos = $derived(data.sanityFacility?.photos ?? []);

	/** @type {{ power: number | null, marketValue: number | null, lastUpdated: Date | null }} */
	let metrics = $state({ power: null, marketValue: null, lastUpdated: null });
	let metricsLoading = $state(false);
	let metricsError = $state(/** @type {string | null} */ (null));

	/** @type {Array<{ code: string, fueltech_id: string, colour: string, values: number[] }>} */
	let unitSeries = $state([]);

	/**
	 * Extract the latest summed value from the API response for a given metric.
	 * API shape: { data: [{ metric, results: [{ name, columns, data: [[ts, val], ...] }] }] }
	 * @param {any[]} items - response.data array
	 * @param {string} metricName - e.g. "power" or "market_value"
	 * @returns {{ value: number | null, timestamp: string | null }}
	 */
	function extractLatestSum(items, metricName) {
		let sum = 0;
		let hasAny = false;
		let latestTimestamp = /** @type {string | null} */ (null);

		for (const metricGroup of items) {
			if (metricGroup.metric !== metricName) continue;

			for (const series of metricGroup.results || []) {
				const dataPoints = series.data || [];
				if (!dataPoints.length) continue;

				// Find the last row with a non-null value
				for (let i = dataPoints.length - 1; i >= 0; i--) {
					const [ts, val] = dataPoints[i];
					if (val !== null && val !== undefined) {
						sum += val;
						hasAny = true;
						if (!latestTimestamp || ts > latestTimestamp) {
							latestTimestamp = ts;
						}
						break;
					}
				}
			}
		}

		return { value: hasAny ? sum : null, timestamp: latestTimestamp };
	}

	$effect(() => {
		if (!facility) return;

		const controller = new AbortController();
		const code = facility.code;
		const networkId = facility.network_id || 'NEM';
		const units = facility.units ?? [];

		metricsLoading = true;
		metricsError = null;

		const params = new URLSearchParams({
			network_id: networkId,
			days: '1',
			interval: '5m',
			metric: 'power,market_value'
		});

		fetch(`/api/facilities/${code}/power?${params}`, { signal: controller.signal })
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((json) => {
				const items = json.response?.data ?? [];

				const powerResult = extractLatestSum(items, 'power');
				const mvResult = extractLatestSum(items, 'market_value');

				const latestTs = powerResult.timestamp || mvResult.timestamp;

				metrics = {
					power: powerResult.value,
					marketValue: mvResult.value,
					lastUpdated: latestTs ? new Date(latestTs) : null
				};

				// Extract per-unit power series for sparklines
				const powerGroup = items.find((/** @type {any} */ d) => d.metric === 'power');
				if (powerGroup?.results) {
					unitSeries = powerGroup.results
						.map((/** @type {any} */ series) => {
							const unit = units.find((/** @type {any} */ u) => u.code === series.name);
							const fueltech_id = unit?.fueltech_id || '';
							return {
								code: series.name,
								fueltech_id,
								colour: getFueltechColor(fueltech_id),
								values: (series.data || []).map((/** @type {any} */ d) => d[1] ?? 0)
							};
						})
						.sort((/** @type {any} */ a, /** @type {any} */ b) => {
							const aMax = Math.max(...a.values);
							const bMax = Math.max(...b.values);
							return bMax - aMax;
						});
				} else {
					unitSeries = [];
				}
			})
			.catch((err) => {
				if (err.name === 'AbortError') return;
				metricsError = err.message || 'Failed to load metrics';
				metrics = { power: null, marketValue: null, lastUpdated: null };
				unitSeries = [];
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					metricsLoading = false;
				}
			});

		return () => controller.abort();
	});

	let formattedPower = $derived(
		metrics.power !== null ? getNumberFormat(1).format(metrics.power) : '—'
	);

	let formattedMarketValue = $derived(
		metrics.marketValue !== null ? '$' + getNumberFormat(2, true).format(metrics.marketValue) : '—'
	);

	let formattedLastUpdated = $derived.by(() => {
		if (!metrics.lastUpdated) return null;
		return new Intl.DateTimeFormat('en-AU', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'Australia/Sydney'
		}).format(metrics.lastUpdated);
	});
</script>

{#if !facility}
	<div class="container py-12">
		<h1 class="text-2xl font-semibold">Facility not found</h1>
		<p class="mt-2 text-mid-warm-grey">
			No facility matched the code <code class="font-mono">{data.code}</code>.
		</p>
		<a href="/facilities" class="mt-4 inline-block text-dark-red underline"> Back to facilities </a>
	</div>
{:else}
	<div class="min-h-screen bg-light-warm-grey px-6 py-12">
		<div class="grid grid-cols-[400px_1fr] gap-8">
			<!-- Left column: Facility info -->
			<div class="space-y-3">
				<div class="flex flex-wrap items-center gap-2">
					{#each unitGroups as group (group.fueltech_id + '---' + group.status_id)}
						<FuelTechBadge
							fuelTech={group.fueltech_id}
							status={group.status_id}
							isCommissioning={group.isCommissioning}
							size="md"
						/>
					{/each}
				</div>
				<h3 class="text-xl font-bold">{facility.name}</h3>
				<p class="text-sm text-mid-grey">{regionLabel} · {facility.network_id}</p>
				{#if facility.description}
					<div class="line-clamp-3 text-xs text-mid-warm-grey">
						{@html facility.description}
					</div>
				{/if}
				{#if photos.length > 0}
					<PhotoCarousel {photos} />
				{/if}
			</div>

			<!-- Right column: Metrics in a single row -->
			<div>
				{#if metricsLoading}
					<div class="flex items-center gap-2 text-sm text-mid-warm-grey">
						<span
							class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mid-grey border-t-transparent"
						></span>
						Loading metrics...
					</div>
				{:else if metricsError}
					<div class="rounded-lg bg-white p-6 text-sm text-dark-red">
						Failed to load metrics: {metricsError}
					</div>
				{:else}
					<div class="flex gap-4">
						<div class="rounded-lg bg-white p-6">
							<p class="text-xs font-medium uppercase tracking-wide text-mid-warm-grey">
								Net Output Power
							</p>
							<p class="mt-1 text-3xl font-bold">
								{formattedPower}
								{#if metrics.power !== null}
									<span class="text-base font-normal text-mid-grey">MW</span>
								{/if}
							</p>
							{#if formattedLastUpdated}
								<p class="mt-2 text-xs text-mid-warm-grey">
									{formattedLastUpdated}
								</p>
							{/if}
						</div>

						<div class="rounded-lg bg-white p-6">
							<p class="text-xs font-medium uppercase tracking-wide text-mid-warm-grey">
								Market Value
							</p>
							<p class="mt-1 text-3xl font-bold">
								{formattedMarketValue}
								{#if metrics.marketValue !== null}
									<span class="text-base font-normal text-mid-grey">/MWh</span>
								{/if}
							</p>
						</div>

						{#if fuelTechMix.length > 0}
							<div class="flex-1 rounded-lg bg-white p-6">
								<p class="text-xs font-medium uppercase tracking-wide text-mid-warm-grey mb-3">
									Fuel Tech Mix
								</p>
								<div class="flex flex-col gap-2">
									<div class="flex h-2 w-full overflow-hidden rounded-full">
										{#each fuelTechMix as seg (seg.fueltech_id)}
											<div
												style="width: {seg.pct}%; background-color: {seg.colour}"
												title="{seg.label}: {seg.pct.toFixed(1)}%"
											></div>
										{/each}
									</div>
									<div class="flex flex-wrap gap-x-3 gap-y-1">
										{#each fuelTechMix as seg (seg.fueltech_id)}
											<div class="flex items-center gap-1">
												<span
													class="inline-block h-2 w-2 shrink-0 rounded-full"
													style="background-color: {seg.colour}"
												></span>
												<span class="text-xxs text-mid-grey">{seg.label}</span>
												<span class="text-xxs font-mono tabular-nums text-mid-grey">
													{seg.pct.toFixed(1)}%
												</span>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			<!-- Unit Sparklines -->
			{#if unitSeries.length > 0}
				<div class="col-span-2">
					<div class="rounded-lg bg-white p-6">
						<p class="text-xs font-medium uppercase tracking-wide text-mid-warm-grey mb-4">
							Unit Generation (24h)
						</p>
						<div class="grid grid-cols-2 gap-x-6 gap-y-3">
							{#each unitSeries as unit (unit.code)}
								{@const max = Math.max(...unit.values, 0)}
								{@const height = 24}
								{@const width = 120}
								{@const points = unit.values.map((v, i) => `${(i / Math.max(unit.values.length - 1, 1)) * width},${height - (max > 0 ? (v / max) * height : 0)}`).join(' ')}
								<div class="flex items-center gap-3">
									<span
										class="inline-block h-2 w-2 shrink-0 rounded-full"
										style="background-color: {unit.colour}"
									></span>
									<span class="w-28 truncate text-xs text-mid-grey font-mono">{unit.code}</span>
									<svg {width} {height} class="shrink-0">
										{#if max > 0}
											<polyline
												points={points}
												fill="none"
												stroke={unit.colour}
												stroke-width="1.5"
												stroke-linejoin="round"
											/>
										{:else}
											<line x1="0" y1={height} x2={width} y2={height} stroke="#ccc" stroke-width="1" stroke-dasharray="2,2" />
										{/if}
									</svg>
									<span class="text-xs font-mono tabular-nums text-mid-grey w-16 text-right">
										{max > 0 ? getNumberFormat(0).format(max) : '—'} <span class="text-xxs">MW</span>
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
