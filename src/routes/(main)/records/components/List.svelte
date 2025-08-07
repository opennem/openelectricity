<script>
	import { regionsWithLabels } from '$lib/regions';
	import { formatRecordValue } from '../page-data-options/formatters';
	import FuelTechIcon from './FuelTechIcon.svelte';
	import recordDescription from '../page-data-options/record-description';
	import { regions } from '../page-data-options/filters';
	import dateTimeQuery from '../page-data-options/date-time-query';
	let { rolledUpRecords } = $props();

	// $inspect('rolledUpRecords', rolledUpRecords);

	/**
	 * @param {*} days
	 */
	function getNonIntervalDayRecords(days) {
		/** @type {*} */
		const records = [];
		const daysArr = [...days];
		daysArr.forEach(([day, { nonIntervalDayRecords }]) => {
			let nonYearRecords = nonIntervalDayRecords.filter((r) => r.period !== 'year');
			if (nonYearRecords.length) {
				records.push([day, nonYearRecords]);
			}
		});
		return records;
	}

	/**
	 * @param {*} days
	 */
	function getYearRecords(days) {
		/** @type {*} */
		const records = [];
		const daysArr = [...days];
		daysArr.forEach(([day, { nonIntervalDayRecords }]) => {
			let yearsRecords = nonIntervalDayRecords.filter((r) => r.period === 'year');
			if (yearsRecords.length) {
				// year is last 4 chars of the day
				let year = day.slice(-4);
				records.push([year, yearsRecords]);
			}
		});
		return records;
	}

	/**
	 * Get the region label
	 * @param {string} networkId
	 * @param {string | undefined} networkRegion
	 * @returns {string}
	 */
	function getRegionLabel(networkId, networkRegion) {
		if (networkRegion) {
			return (
				regions.find(({ value }) => value === networkRegion.toLowerCase())?.label || networkRegion
			);
		}
		return regions.find(({ value }) => value === networkId.toLowerCase())?.label || networkId;
	}

	/**
	 * Get the record description
	 * @param {MilestoneRecord} record
	 * @returns {string}
	 */
	function getRecordDescription(record) {
		let desc = recordDescription(
			record.period,
			record.aggregate,
			record.metric,
			record.fueltech_id
		);
		let networkId = record.network_id?.toLowerCase();

		if (record.network_region) {
			desc += ` in ${regionsWithLabels[record.network_region.toLowerCase()]}`;
		} else if (networkId && regionsWithLabels[networkId]) {
			desc += ` in ${regionsWithLabels[networkId]}`;
		} else {
			desc += ` in the ${networkId?.toUpperCase()}`;
		}

		return desc;
	}
</script>

<div class="md:w-[600px] mx-auto">
	{#each [...rolledUpRecords] as [month, days]}
		{@const monthRecords = getNonIntervalDayRecords(days)}
		{@const yearRecords = getYearRecords(days)}
		<div class="mt-10 first:mt-0">
			{#if yearRecords.length}
				<p
					class="sticky top-0 z-20 bg-white/80 backdrop-blur-xs pt-6 pb-4 pl-6 md:pl-0 mb-0 border-b border-warm-grey font-space uppercase"
				>
					{yearRecords[0][0]}
				</p>
			{/if}

			{#each yearRecords as [day, records]}
				<div>
					<ul>
						{#each records as record}
							{@const path = `/records/${encodeURIComponent(record.record_id)}?${dateTimeQuery(record.interval)}&focus=${record.time}`}
							<li>
								<a
									href={path}
									class="hover:no-underline bg-white hover:bg-warm-grey text-dark-grey rounded-lg border border-mid-warm-grey mb-3 grid grid-cols-1 md:grid-cols-10 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-mid-warm-grey"
								>
									<div class="md:col-span-6 py-8 px-6 flex align-middle gap-4">
										<div class="place-self-start flex flex-col gap-1 items-center relative -top-2">
											<span
												class=" bg-{record.fueltech_id || 'demand'} rounded-full p-2 block"
												class:text-black={record.fueltech_id === 'solar'}
												class:text-white={record.fueltech_id !== 'solar'}
											>
												<FuelTechIcon fuelTech={record.fueltech_id || 'demand'} sizeClass={8} />
											</span>
											<!-- <div class="text-xs text-mid-grey font-space">
												{getRegionLabel(record.network_id, record.network_region)}
											</div> -->
										</div>

										<div class="leading-base">
											{getRecordDescription(record)}

											<!-- <small class="block text-xs">
												{getFormattedDateTime(record.date)}<br />
												{record.interval}<br />
												{record.period}
											</small> -->
											<!-- <small class="block text-xxs text-mid-warm-grey">{latest.record_id}</small> -->
										</div>
									</div>

									<ol class="md:col-span-4 p-8 md:rounded-r-lg">
										<li class="text-sm text-mid-grey flex items-center justify-between">
											<div>
												<span class="font-mono text-base text-dark-grey">
													{formatRecordValue(record.value, record.fueltech_id)}
												</span>
												<span class="text-xs font-mono">{record.value_unit}</span>
											</div>
										</li>
									</ol>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}

			{#if monthRecords.length || !yearRecords.length}
				<p
					class="sticky top-0 z-20 bg-white/80 backdrop-blur-xs pt-6 pb-4 pl-6 md:pl-0 mb-0 border-b border-warm-grey font-space uppercase"
				>
					{month}
				</p>
			{/if}

			{#each monthRecords as [day, records]}
				<div>
					<ul>
						{#each records as record}
							{@const path = `/records/${encodeURIComponent(record.record_id)}?${dateTimeQuery(record.interval)}&focus=${record.time}`}
							<li>
								<a
									href={path}
									class="hover:no-underline bg-white hover:bg-warm-grey text-dark-grey rounded-lg border border-mid-warm-grey mb-3 grid grid-cols-1 md:grid-cols-10 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-mid-warm-grey"
								>
									<div class="md:col-span-6 py-8 px-6 flex align-middle gap-4">
										<div class="place-self-start flex flex-col gap-1 items-center relative -top-2">
											<span
												class=" bg-{record.fueltech_id || 'demand'} rounded-full p-2 block"
												class:text-black={record.fueltech_id === 'solar'}
												class:text-white={record.fueltech_id !== 'solar'}
											>
												<FuelTechIcon fuelTech={record.fueltech_id || 'demand'} sizeClass={8} />
											</span>
											<!-- <div class="text-xs text-mid-grey font-space">
												{getRegionLabel(record.network_id, record.network_region)}
											</div> -->
										</div>

										<div class="leading-base">
											{getRecordDescription(record)}

											<!-- <small class="block text-xs">
												{getFormattedDateTime(record.date)}<br />
												{record.interval}<br />
												{record.period}
											</small> -->
											<!-- <small class="block text-xxs text-mid-warm-grey">{latest.record_id}</small> -->
										</div>
									</div>

									<ol class="md:col-span-4 p-8 md:rounded-r-lg">
										<li class="text-sm text-mid-grey flex items-center justify-between">
											<div>
												<span class="font-mono text-base text-dark-grey">
													{formatRecordValue(record.value, record.fueltech_id)}
												</span>
												<span class="text-xs font-mono">{record.value_unit}</span>
											</div>
										</li>
									</ol>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}

			{#each [...days] as [day, { date, records, nonIntervalDayRecords }]}
				{@const nonIntervalDayLength = nonIntervalDayRecords.length}

				{#if nonIntervalDayLength === 0}
					<div>
						<p
							class="sticky top-[50px] z-10 bg-white/80 mt-6 mb-2 py-2 pl-6 md:pl-0 backdrop-blur-xs text-xs font-space"
						>
							{date}
						</p>

						<ul>
							{#each [...records] as [key, value]}
								{@const latest = value[0]}
								{@const lastest3Records = value.slice(0, 3)}
								{@const path = `/records/${encodeURIComponent(latest.record_id)}?${dateTimeQuery(latest.interval)}&focus=${latest.time}`}
								<li>
									<a
										href={path}
										class="hover:no-underline bg-white hover:bg-warm-grey text-dark-grey rounded-lg border border-mid-warm-grey mb-3 grid grid-cols-1 md:grid-cols-10 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-mid-warm-grey"
									>
										<div class="md:col-span-6 py-8 px-6 flex align-middle gap-4">
											<div
												class="place-self-start flex flex-col gap-1 items-center relative -top-2"
											>
												<span
													class=" bg-{latest.fueltech_id || 'demand'} rounded-full p-2 block"
													class:text-black={latest.fueltech_id === 'solar'}
													class:text-white={latest.fueltech_id !== 'solar'}
												>
													<FuelTechIcon fuelTech={latest.fueltech_id || 'demand'} sizeClass={8} />
												</span>
											</div>

											<div class="leading-base">
												{getRecordDescription(latest)}
											</div>
										</div>

										<ol class="md:col-span-4 p-8 md:rounded-r-lg">
											{#each lastest3Records as record, i}
												{@const formattedDate = new Intl.DateTimeFormat('en-AU', {
													hour: 'numeric',
													minute: 'numeric',
													timeZone: record.timeZone
												}).format(record.time)}
												<li class="text-sm text-mid-grey flex items-center justify-between">
													<div>
														<span
															class="font-mono"
															class:text-base={i === 0}
															class:text-dark-grey={i === 0}
														>
															{formatRecordValue(record.value, record.fueltech_id)}
														</span>
														{#if i === 0}
															<span class="text-xs font-mono">{record.value_unit}</span>
														{/if}
													</div>

													{#if record.period === 'interval'}
														<time datetime={record.interval} class="text-xs font-mono">
															{formattedDate}
														</time>
													{/if}
												</li>
											{/each}
										</ol>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
		</div>
	{/each}
</div>
