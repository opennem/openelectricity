<script>
	import { format } from 'date-fns';
	import { formatValue } from '$lib/utils/formatters.js';

	export let rolledUpRecords;
</script>

<div class="w-[600px] mx-auto">
	{#each [...rolledUpRecords] as [month, days]}
		<p class="sticky top-0 bg-light-warm-grey py-4 mt-4">{format(month, 'MMMM yyyy')}</p>

		{#each [...days] as [day, { date, records, time }]}
			<p class="sticky top-14 bg-light-warm-grey py-2 text-xs">
				{format(day, 'EEE, dd MMM')}
			</p>

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

								<small class="block text-xxs text-mid-grey">{latest.record_id}</small>
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
		{/each}
	{/each}
	<!-- {#each rolledUpRecords as { date, records }}
		{@const formattedDate = format(date, 'd MMM yyyy')}
		<div>
			<div class="text-dark-grey font-space mb-2 uppercase">
				{formattedDate}
			</div>
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

								<small class="block text-xxs text-mid-grey">{latest.record_id}</small>
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
	{/each} -->
</div>
