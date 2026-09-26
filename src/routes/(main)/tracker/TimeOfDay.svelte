<script>
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import ProfileChart from './ProfileChart.svelte';
	import { individualProfileRows } from './profile-chart.js';
	import { getGroup, GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { DEFAULT_GROUP } from './tracker-model.js';
	import { createProfileData } from './profile-data.svelte.js';
	import AverageDayStack from './AverageDayStack.svelte';
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { hasSpotPrice, regionLabel as regionLabelFor } from './tracker-regions.js';
	import { datasetToCsv, trackerFileName } from './tracker-export.js';
	import {
		buildDailyProfile,
		normaliseProfileDays,
		normaliseProfileView,
		profileWindow,
		profileDataset,
		PROFILE_DAY_OPTIONS,
		PROFILE_MIN_DATE,
		PROFILE_VIEW_OPTIONS
	} from './time-of-day.js';

	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>}} */
	let { session } = $props();
	/** Nav controls beside the FilterSelect pills share FilterPill's compact box. */
	const NAV_CONTROL =
		'rounded-lg border border-warm-grey bg-white px-4 py-2.5 text-xs font-medium whitespace-nowrap text-dark-grey';
	let selection = $derived(session.selection);
	let region = $derived(selection.region);
	let groupId = $derived(selection.group);
	let days = $derived(selection.profileDays);
	let lastDate = $derived(selection.profileEnd);
	let zone = $derived(session.timeZone);
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
	let source = $derived(price ? priceData : powerData);
	let error = $derived(source.error);
	let pending = $derived(source.pending);
	let meta = $derived(source.meta);
	let series = $derived(
		!price && selection.profileSeries ? selection.profileSeries : (meta?.seriesNames[0] ?? '')
	);
	let label = $derived(
		meta?.seriesLabels[series] ?? group.labels[series] ?? (price ? 'Spot price' : 'Generation')
	);
	let metricOptions = $derived([
		{ value: 'power', label: 'Power' },
		...(hasSpotPrice(region) ? [{ value: 'price', label: 'Spot price' }] : [])
	]);
	/** The loaded series, plus a linked series this window lacks. */
	let seriesOptions = $derived.by(() => {
		const options = (meta?.seriesNames ?? []).map((name) => ({
			value: name,
			label: meta?.seriesLabels[name] ?? name
		}));
		const linked = selection.profileSeries;
		if (linked && !meta?.seriesNames.includes(linked))
			options.unshift({ value: linked, label: `${group.labels[linked]} (unavailable)` });
		return options.length ? options : [{ value: '', label: 'Fuel technology' }];
	});
	let regionLabel = $derived(regionLabelFor(region));
	let profile = $derived(buildDailyProfile(source.rows, series, window));
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
		source.retry();
	}
	function download() {
		if (pending || error || !available) return;
		downloadCsv(
			datasetToCsv(
				profileDataset(profile, window, { label, unit, region: regionLabel, timeZone: zone }),
				zone
			),
			trackerFileName({
				scope: region,
				dataset: `time-of-day-${selection.profileMetric}`,
				range: window.lastDate,
				extension: 'csv'
			})
		);
	}
	export function getControls() {
		return controls;
	}
</script>

{#snippet controls()}
	<FilterSelect
		selected={groupId}
		options={GROUP_OPTIONS}
		listLabel="Fuel tech grouping"
		defaultValue={DEFAULT_GROUP}
		compact
		onchange={(value) => session.select('group', value)}
	/>
	<FilterSelect
		selected={selection.profileView}
		options={PROFILE_VIEW_OPTIONS}
		listLabel="View"
		defaultValue="average"
		compact
		onchange={(value) => session.select('profileView', normaliseProfileView(value))}
	/>
	<FilterSelect
		selected={String(days)}
		options={PROFILE_DAY_OPTIONS}
		listLabel="Window"
		defaultValue="7"
		compact
		onchange={(value) => session.select('profileDays', normaliseProfileDays(value))}
	/>
	<label
		><span class="sr-only">Last day</span>
		<input
			type="date"
			class={NAV_CONTROL}
			min={PROFILE_MIN_DATE}
			max={window.maxDate}
			value={window.lastDate}
			onchange={(event) => {
				if (event.currentTarget.validity.valid)
					session.select('profileEnd', event.currentTarget.value);
			}}
		/>
	</label>
	{#if selection.profileEnd}<button
			class="cursor-pointer {NAV_CONTROL}"
			onclick={() => session.select('profileEnd', '')}>Latest complete days</button
		>{/if}
	<FilterSelect
		selected={selection.profileMetric}
		options={metricOptions}
		listLabel="Metric"
		defaultValue="power"
		compact
		onchange={(value) => session.select('profileMetric', value === 'price' ? 'price' : 'power')}
	/>
	{#if !price}
		<FilterSelect
			selected={series}
			options={seriesOptions}
			listLabel="Fuel technology"
			compact
			disabled={pending || !meta}
			onchange={(value) => session.select('profileSeries', value)}
		/>
	{/if}
{/snippet}

<section
	class="overflow-auto p-3 sm:p-5"
	aria-label="Profile analysis"
	aria-busy={pending}
	data-png-context={`${regionLabel} · ${window.dates[0]} to ${window.lastDate} · UTC${zone} · ${group.label}`}
>
	<div class="mx-auto max-w-[1400px] rounded-lg border border-warm-grey bg-white p-4 sm:p-6">
		<div class="flex flex-wrap items-end gap-4">
			<div class="mr-auto">
				<h1 class="mb-0 text-xl font-bold leading-tight">Profile</h1>
				<p class="mt-1 text-sm text-mid-grey">
					{regionLabel} · {window.dates[0]} to {window.lastDate} · UTC{zone}
				</p>
			</div>
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
		<AverageDayStack source={powerData} {window} {zone} groupLabel={group.label} />
		{#if error}
			<div role="alert" class="py-12 text-center">
				<p>{error}</p>
				<button class="control mt-3" onclick={retry}>Retry profile</button>
			</div>
		{:else if pending}
			<p role="status" class="py-20 text-center">Loading profile data…</p>
		{:else if !available}
			<p role="status" class="py-20 text-center">No profile data available for this selection.</p>
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
