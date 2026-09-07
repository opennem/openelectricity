<script>
	import FuelTechOptions from './FuelTechOptions.svelte';
	import ProfileChart from './ProfileChart.svelte';
	import { individualProfileRows } from './profile-chart.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { getGroup } from '$lib/components/charts/network/groups.js';
	import { createProfileData } from './profile-data.svelte.js';
	import AverageDayStack from './AverageDayStack.svelte';
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { hasSpotPrice, TRACKER_REGION_OPTIONS } from './tracker-regions.js';
	import {
		buildDailyProfile,
		normaliseProfileDays,
		profileWindow,
		profileCsv
	} from './time-of-day.js';

	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>}} */
	let { session } = $props();
	let selection = $derived(session.selection);
	let region = $derived(selection.region);
	let groupId = $derived(selection.group);
	let days = $derived(selection.profileDays);
	let lastDate = $derived(selection.profileEnd);
	let zone = $derived(regionToNetwork(region).timeZone);
	let window = $derived(profileWindow(session.anchorEnd, zone, days, lastDate));
	let group = $derived(getGroup(groupId));
	let daily = $derived(selection.profileView === 'daily');
	let price = $derived(selection.profileMetric === 'price');
	let unit = $derived(price ? '$/MWh' : 'MW');
	const powerData = createProfileData(() => ({ region, metric: 'power', zone, group, window }));
	const priceData = createProfileData(() => ({
		region,
		metric: 'price',
		zone,
		group,
		window,
		enabled: price
	}));
	let manager = $derived(price ? priceData.manager : powerData.manager);
	let error = $derived(manager?.getErrorForRange(window.start, window.end));
	let pending = $derived(
		!error &&
			(!manager || !manager.initialLoadComplete || manager.hasPendingFetch || manager.isLoading)
	);
	let meta = $derived(manager?.seriesMeta);
	let series = $derived(
		!price && selection.profileSeries ? selection.profileSeries : (meta?.seriesNames[0] ?? '')
	);
	let label = $derived(
		meta?.seriesLabels[series] ?? group.labels[series] ?? (price ? 'Spot price' : 'Generation')
	);
	let regionLabel = $derived(
		TRACKER_REGION_OPTIONS.find((option) => option.value === selection.region)?.label ??
			selection.region
	);
	let profile = $derived(
		buildDailyProfile(manager?.getDataForRange(window.start, window.end) ?? [], series, window)
	);
	let available = $derived(profile.some((row) => row.average !== null));
	let chartRows = $derived(individualProfileRows(profile, window.dates, daily));
	let chartNames = $derived(daily ? [...window.dates, 'average'] : ['average']);
	let chartLabels = $derived(
		Object.fromEntries(chartNames.map((name) => [name, name === 'average' ? 'Average' : name]))
	);
	let chartColours = $derived(
		Object.fromEntries(
			chartNames.map((name) => [
				name,
				name === 'average' ? '#222222' : (meta?.seriesColours[series] ?? '#777777')
			])
		)
	);
	const format = (/** @type {number | null} */ value) =>
		value === null ? '—' : value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
	function retry() {
		manager?.requestRange(window.start, window.end, { immediate: true });
	}
	function download() {
		if (pending || error || !available) return;
		downloadCsv(
			profileCsv(profile, window, { label, unit, region: regionLabel, timeZone: zone }),
			`openelectricity-${selection.region}-time-of-day-${selection.profileMetric}-${window.lastDate}.csv`
		);
	}
</script>

<section
	class="overflow-auto p-3 sm:p-5"
	aria-label="Time-of-day analysis"
	aria-busy={pending}
	data-png-context={`${regionLabel} · ${window.dates[0]} to ${window.lastDate} · UTC${zone} · ${group.label}`}
>
	<div class="mx-auto max-w-[1400px] rounded-lg border border-warm-grey bg-white p-4 sm:p-6">
		<div class="flex flex-wrap items-end gap-4">
			<div class="mr-auto">
				<h1 class="mb-0 text-xl font-bold leading-tight">Time of day</h1>
				<p class="mt-1 text-sm text-mid-grey">
					{regionLabel} · {window.dates[0]} to {window.lastDate} · UTC{zone}
				</p>
			</div>
			<FuelTechOptions group={groupId} ongroupchange={(value) => session.select('group', value)} />
			<label
				>View
				<select
					value={selection.profileView}
					onchange={(event) =>
						session.select(
							'profileView',
							event.currentTarget.value === 'daily' ? 'daily' : 'average'
						)}
				>
					<option value="average">Average day</option><option value="daily">Daily overlay</option>
				</select>
			</label>
			<label
				>Window
				<select
					value={selection.profileDays}
					onchange={(event) =>
						session.select('profileDays', normaliseProfileDays(event.currentTarget.value))}
				>
					{#each [7, 14, 28] as days (days)}<option value={days}>{days} days</option>{/each}
				</select>
			</label>
			<label
				>Last day
				<input
					type="date"
					min="1999-01-01"
					max={window.maxDate}
					value={window.lastDate}
					onchange={(event) => {
						if (event.currentTarget.validity.valid)
							session.select('profileEnd', event.currentTarget.value);
					}}
				/>
			</label>
			{#if selection.profileEnd}<button
					class="control"
					onclick={() => session.select('profileEnd', '')}>Latest complete days</button
				>{/if}
			<label
				>Metric
				<select
					value={selection.profileMetric}
					onchange={(event) =>
						session.select(
							'profileMetric',
							event.currentTarget.value === 'price' ? 'price' : 'power'
						)}
				>
					<option value="power">Power</option><option
						value="price"
						disabled={!hasSpotPrice(selection.region)}>Spot price</option
					>
				</select>
			</label>
			{#if !price}
				<label
					>Fuel technology
					<select
						value={series}
						disabled={pending || !meta}
						onchange={(event) => session.select('profileSeries', event.currentTarget.value)}
					>
						{#if selection.profileSeries && !meta?.seriesNames.includes(selection.profileSeries)}
							<option value={selection.profileSeries}
								>{group.labels[selection.profileSeries]} (unavailable)</option
							>
						{/if}
						{#each meta?.seriesNames ?? [] as name (name)}<option value={name}
								>{meta?.seriesLabels[name] ?? name}</option
							>{/each}
					</select>
				</label>
			{/if}
			<button class="control" disabled={pending || !!error || !available} onclick={download}
				>Download profile CSV</button
			>
		</div>
		<p class="mt-4 text-xs leading-relaxed text-mid-grey">
			Complete days only, in network time (no daylight saving). Each half-hour averages available
			5-minute readings; the average profile weights each available day equally. Gaps are not zero. {price
				? 'Spot price is time-weighted, not volume-weighted.'
				: 'Absolute power; charging and pumping are negative. Timeline visibility and transforms do not apply.'}
		</p>
		<AverageDayStack manager={powerData.manager} {window} {zone} groupLabel={group.label} />
		{#if error}
			<div role="alert" class="py-12 text-center">
				<p>{error}</p>
				<button class="control mt-3" onclick={retry}>Retry profile</button>
			</div>
		{:else if pending}
			<p role="status" class="py-20 text-center">Loading time-of-day data…</p>
		{:else if !available}
			<p role="status" class="py-20 text-center">
				No time-of-day data available for this selection.
			</p>
		{:else}
			<ProfileChart
				rows={chartRows}
				names={chartNames}
				labels={chartLabels}
				colours={chartColours}
				title={label}
				{zone}
				{price}
			/>
			<details class="mt-5 border-t border-warm-grey pt-3">
				<summary class="cursor-pointer text-sm">Profile data and coverage</summary>
				<p class="my-2 text-xs text-mid-grey">
					Days available can vary by half-hour. Brackets show native readings per day (normally 6);
					CSV includes these counts. Missing values are shown as —.
				</p>
				<div class="overflow-x-auto">
					<table class="w-full whitespace-nowrap text-right font-space text-xs">
						<caption class="py-2 text-left"
							>{label} ({unit}), UTC{zone}, {window.dates[0]}–{window.lastDate}</caption
						>
						<thead
							><tr
								><th scope="col">Time</th><th scope="col">Average</th><th scope="col"
									>Days available</th
								>{#if daily}{#each window.dates as date (date)}<th scope="col">{date}</th
										>{/each}{/if}</tr
							></thead
						>
						<tbody
							>{#each profile as row (row.minute)}<tr
									><th scope="row">{row.label}</th><td>{format(row.average)}</td><td
										>{row.days}/{window.dates.length}</td
									>{#if daily}{#each window.dates as date, i (date)}<td
												>{format(row.values[i])} ({row.samples[i]})</td
											>{/each}{/if}</tr
								>{/each}</tbody
						>
					</table>
				</div>
			</details>
		{/if}
	</div>
</section>

<style>
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: var(--text-xs);
	}
	select,
	input,
	.control {
		border: 1px solid var(--color-warm-grey, #ddd);
		border-radius: 0.6rem;
		padding: 0.8rem 1rem;
		min-height: 3.6rem;
		font-size: var(--text-xs);
		background: white;
		color: inherit;
	}
	.control:not(:disabled) {
		cursor: pointer;
	}
	:disabled {
		opacity: 0.5;
	}
	th,
	td {
		padding: 0.5rem;
		border-bottom: 1px solid #eee;
	}
</style>
