<script>
	import { getFormattedTime } from '$lib/utils/formatters.js';
	import { formatRecordValue } from '../page-data-options/formatters';
	import FuelTechIcon from './FuelTechIcon.svelte';
	import recordDescription from '../page-data-options/record-description';

	let { rolledUpRecords } = $props();

	/**
	 * @param {*} days
	 */
	function getNonIntervalDayRecords(days) {
		/** @type {*} */
		const records = [];
		const daysArr = [...days];
		daysArr.forEach(([day, { nonIntervalDayRecords }]) => {
			if (nonIntervalDayRecords.length) {
				records.push([day, nonIntervalDayRecords]);
			}
		});
		return records;
	}
</script>

<div class="md:w-[600px] mx-auto">
	{#each [...rolledUpRecords] as [month, days]}
		{@const monthRecords = getNonIntervalDayRecords(days)}
		<div class="mt-20 first:mt-0">
			<p
				class="sticky top-0 z-20 bg-light-warm-grey/80 backdrop-blur-sm pt-6 pb-4 pl-6 md:pl-0 mb-0 border-b border-warm-grey font-space uppercase"
			>
				{month}
			</p>

			{#each monthRecords as [day, records]}
				<div>
					<ul>
						{#each records as record}
							{@const significant = record.significance > 11}

							<li>
								<a
									href="/records/{encodeURIComponent(record.record_id)}"
									class="hover:no-underline bg-white hover:bg-warm-grey text-dark-grey rounded-lg border border-mid-warm-grey mb-6 grid grid-cols-10 gap-4 divide-x divide-mid-warm-grey"
								>
									<div class="col-span-6 py-8 px-6 flex align-middle gap-4">
										{#if record.fueltech_id}
											<span
												class="relative -top-[2px] bg-{record.fueltech_id} rounded-full p-2 place-self-start"
												class:text-black={record.fueltech_id === 'solar'}
												class:text-white={record.fueltech_id !== 'solar'}
											>
												<FuelTechIcon fuelTech={record.fueltech_id} sizeClass={5} />
											</span>
										{/if}
										<div
											class="leading-base"
											class:text-lg={significant}
											class:leading-lg={significant}
										>
											{recordDescription(
												record.period,
												record.aggregate,
												record.metric,
												record.fueltech_id
											)}
											<!-- <small class="block text-xs">
												{getFormattedDateTime(record.date)}<br />
												{record.interval}<br />
												{record.period}
											</small> -->
											<!-- <small class="block text-xxs text-mid-warm-grey">{latest.record_id}</small> -->
										</div>
									</div>

									<ol class="col-span-4 p-8 rounded-r-lg" class:bg-gas_recip={significant}>
										<li class="text-sm text-mid-grey flex items-center justify-between">
											<div>
												<span
													class="font-mono text-base text-dark-grey"
													class:text-lg={significant}
												>
													{formatRecordValue(record.value, record.fueltech_id)}
												</span>
												<span class="text-xs">{record.value_unit}</span>
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
							class="sticky top-[50px] z-10 bg-light-warm-grey/80 mt-10 py-2 pl-6 md:pl-0 backdrop-blur-sm text-xs font-space"
						>
							{date}
						</p>

						<ul>
							{#each [...records] as [key, value]}
								{@const latest = value[0]}
								{@const significant = latest.significance > 11}
								{@const lastest3Records = value.slice(0, 3)}
								<li>
									<a
										href="/records/{encodeURIComponent(latest.record_id)}"
										class="hover:no-underline bg-white hover:bg-warm-grey text-dark-grey rounded-lg border border-mid-warm-grey mb-6 grid grid-cols-10 gap-4 divide-x divide-mid-warm-grey"
									>
										<div class="col-span-6 py-8 px-6 flex align-middle gap-4">
											{#if latest.fueltech_id}
												<span
													class="relative -top-[2px] bg-{latest.fueltech_id} rounded-full p-2 place-self-start"
													class:text-black={latest.fueltech_id === 'solar'}
													class:text-white={latest.fueltech_id !== 'solar'}
												>
													<FuelTechIcon fuelTech={latest.fueltech_id} sizeClass={5} />
												</span>
												<!-- <span class="relative -top-[2px]">
													<FuelTechTag
														pxClass="px-2"
														showText={false}
														iconSize={14}
														fueltech={latest.fueltech_id}
													/>
												</span> -->
											{/if}
											<div
												class="leading-base"
												class:text-lg={significant}
												class:leading-lg={significant}
											>
												{recordDescription(
													latest.period,
													latest.aggregate,
													latest.metric,
													latest.fueltech_id
												)}
												<!-- <small class="block text-xs">
													{getFormattedDateTime(latest.date)}<br />
													{latest.interval}<br />
													{latest.period}
												</small> -->
												<!-- <small class="block text-xxs text-mid-warm-grey">{latest.record_id}</small> -->
											</div>
										</div>

										<ol class="col-span-4 p-8 rounded-r-lg" class:bg-gas_recip={significant}>
											{#each lastest3Records as record, i}
												{@const isWem = record.network_id === 'wem'}
												{@const timeZone = isWem ? 'Australia/Perth' : undefined}
												<li class="text-sm text-mid-grey flex items-center justify-between">
													<div>
														<span
															class="font-mono"
															class:text-base={i === 0}
															class:text-dark-grey={i === 0}
															class:text-lg={significant}
														>
															{formatRecordValue(record.value, record.fueltech_id)}
														</span>
														{#if i === 0}
															<span class="text-xs">{record.value_unit}</span>
														{/if}
													</div>

													{#if record.period === 'interval'}
														<time datetime={record.interval} class="text-xs font-mono">
															{getFormattedTime(record.date, timeZone)}
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
