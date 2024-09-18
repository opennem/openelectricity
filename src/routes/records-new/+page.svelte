<script>
	import { group, rollup } from 'd3-array';
	import { timeDay } from 'd3-time';
	import { parseISO, format } from 'date-fns';

	import { browser } from '$app/environment';

	import { formatValue } from '$lib/utils/formatters.js';

	import {
		aggregateOptions,
		periodOptions,
		fuelTechOptions,
		milestoneTypeOptions
	} from './page-data-options/filters.js';

	export let data;

	let errorMessage = '';
	/** @type {MilestoneRecord[]} */
	let recordsData = [];
	let totalRecords = 0;
	let pageSize = 1000;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * 100 + 1;

	//TODO: refactor to store
	/** @type {string[]} */
	let checkedRegions =
		data.regions && data.regions.length
			? data.regions
			: ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

	/** @type {string[]} */
	let checkedFuelTechs =
		data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : fuelTechOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedPeriods =
		data.periods && data.periods.length ? data.periods : periodOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedAggregates =
		data.aggregates && data.aggregates.length
			? data.aggregates
			: aggregateOptions.map((i) => i.value);

	let checkedMilestoneTypes =
		data.milestoneTypes && data.milestoneTypes.length
			? data.milestoneTypes
			: milestoneTypeOptions.map((i) => i.value);

	let selectedSignificance = data.significance || 6;

	let recordIdSearch = data.stringFilter || '';

	$: fetchRecords(
		currentPage,
		checkedRegions,
		checkedPeriods,
		checkedFuelTechs,
		checkedAggregates,
		checkedMilestoneTypes,
		selectedSignificance
	);
	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

	/**
	 *
	 * @param {{
	 * regions: string[],
	 * periods: string[],
	 * fuelTechs: string[],
	 * stringFilter: string,
	 * aggregates: string[],
	 * milestoneTypes: string[],
	 * significance: number
	 * }} param0
	 */
	function getFilterParams({
		regions,
		periods,
		fuelTechs,
		stringFilter,
		aggregates,
		milestoneTypes,
		significance
	}) {
		const validRegions = regions.filter((r) => r !== '_all');

		const regionsParam =
			regions.length === 0 || regions.length === 7 ? '' : '&regions=' + validRegions.join(',');

		const periodsParam =
			periods.length === periodOptions.length ? '' : '&periods=' + periods.join(',');

		const aggregatesParam =
			aggregates.length === aggregateOptions.length ? '' : '&aggregates=' + aggregates.join(',');

		const milestoneTypesParam =
			milestoneTypes.length === milestoneTypeOptions.length
				? ''
				: '&milestone_types=' + milestoneTypes.join(',');

		const fuelTechParams =
			fuelTechs.length === fuelTechOptions.length ? '' : '&fuelTechs=' + fuelTechs.join(',');

		const recordIdSearchParam = stringFilter
			? `&recordIdFilter=${encodeURIComponent(stringFilter.trim())}`
			: '';

		const significanceParam = significance ? `&significance=${significance}` : '';

		return {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams,
			aggregatesParam,
			milestoneTypesParam,
			significanceParam
		};
	}

	async function fetchRecords(
		page = 1,
		regions = checkedRegions,
		periods = checkedPeriods,
		fuelTechs = checkedFuelTechs,
		aggregates = checkedAggregates,
		milestoneTypes = checkedMilestoneTypes,
		significance = selectedSignificance
	) {
		const {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams,
			aggregatesParam,
			milestoneTypesParam,
			significanceParam
		} = getFilterParams({
			regions,
			periods,
			stringFilter: recordIdSearch,
			fuelTechs,
			aggregates,
			milestoneTypes,
			significance
		});

		if (browser) {
			const res = await fetch(
				`/api/records?page=${page}&pageSize=${pageSize}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${milestoneTypesParam}${significanceParam}`
			);
			const jsonData = await res.json();

			console.log(jsonData);

			if (jsonData.success) {
				errorMessage = '';
				recordsData = jsonData.data.map((d) => {
					const parsedInterval = parseISO(d.interval);
					return {
						...d,
						date: parsedInterval,
						time: parsedInterval.getTime()
					};
				});
				totalRecords = jsonData.total_records;
			} else {
				recordsData = [];
				totalRecords = 0;
				errorMessage = jsonData.error;
			}
		}
	}
	$: rolledUpRecords = rollup(
		recordsData,
		(/** @type {MilestoneRecord[]} */ d) => {
			const latestTime = d.map((d) => d.time).reduce((a, b) => Math.max(a, b), 0);
			return {
				time: latestTime,
				date: new Date(latestTime),
				records: group(d, (d) => d.record_id)
			};
		},
		(/** @type {MilestoneRecord} */ d) => timeDay(d.date)
	);
	$: sortedRolledUpRecords = Array.from(rolledUpRecords.values()).sort((a, b) => b.time - a.time);
	$: console.log('rolledUpRecords', rolledUpRecords);
	$: console.log('sortedRolledUpRecords', sortedRolledUpRecords);
</script>

<div class="grid grid-cols-6 divide-x">
	<div class="col-span-2 flex justify-end">
		<section class="w-[400px] bg-mid-grey">
			<h2>Records</h2>

			<div>
				<h4>Filters</h4>
			</div>
		</section>
	</div>

	<main class="col-span-4 bg-light-warm-grey min-h-[600px] py-12">
		<div class="w-[600px] mx-auto">
			{#each sortedRolledUpRecords as { date, records }}
				<div>
					<div class="text-dark-grey font-space mb-2 uppercase">{format(date, 'd MMM yyyy')}</div>
					<ul>
						{#each [...records] as [key, value]}
							{@const latest = value[0]}
							{@const significant = latest.significance > 8}
							{@const lastest3Records = value.slice(0, 3)}
							<li>
								<a
									href="/records-new/{encodeURIComponent(latest.record_id)}"
									class="hover:no-underline bg-white hover:bg-warm-grey text-dark-grey rounded-lg border border-mid-warm-grey mb-6 grid grid-cols-10 gap-4 divide-x divide-mid-warm-grey"
								>
									<div class="col-span-6 p-8" class:text-lg={significant}>
										{latest.description}
									</div>

									<ol class="col-span-4 p-8 rounded-r-lg" class:bg-gas_recip={significant}>
										{#each lastest3Records as record, i}
											<li class="text-sm text-mid-grey flex items-center justify-between">
												<div>
													<span
														class:text-base={i === 0}
														class:text-dark-grey={i === 0}
														class:text-lg={significant}
													>
														{formatValue(record.value)}
													</span>
													{#if i === 0}
														<span class="text-xs">{record.value_unit}</span>
													{/if}
												</div>

												<time datetime={record.interval} class="text-xs">
													{format(record.date, 'h:mma')}
												</time>
											</li>
										{/each}
									</ol>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</main>
</div>
