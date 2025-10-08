<script>
	import { parseAbsolute, today, getLocalTimeZone } from '@internationalized/date';
	import { formatDateBySpecificity } from '$lib/utils/date-format';
	import { getNumberFormat, formatDateTime } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import groupByMonthDay from './page-data-options/group-by-month-day';
	import getDateField from './page-data-options/get-date-field';
	import { regions } from './page-data-options/filters';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';

	const numberFormatter = getNumberFormat(0);
	let { facilities = [] } = $props();

	let flattenedData = $derived.by(() => {
		/** @type {*[]} */
		let data = [
			// {
			// 	zonedDateTime: today(getLocalTimeZone()),
			// 	isToday: true
			// }
		];
		facilities.forEach((facility) => {
			const offset = facility.network_id === 'WEM' ? '+08:00' : '+10:00';
			facility.units.forEach((/** @type {*} */ unit) => {
				const dateField = getDateField(unit.status_id);
				const dateValue = unit[dateField];

				if (!dateValue) {
					console.log(unit.code, 'unit has no', dateField);
				} else {
					const dateStr =
						typeof dateValue === 'string'
							? dateValue.includes('Z')
								? dateValue.split('Z')[0]
								: dateValue.split('+')[0]
							: dateValue;

					// inconsistent data format, some have Z, some have +
					// assume return string is always in UTC
					let parsedZonedDate = parseAbsolute(dateStr + 'Z', offset);
					// console.log('parsedZonedDate', parsedZonedDate);
					data.push({
						...facility,
						zonedDateTime: parsedZonedDate,
						[dateField + '_formatted']: formatDateBySpecificity(
							unit[dateField],
							unit[dateField + '_specificity']
						),
						unit
					});
				}
			});
		});
		return data;
	});

	// sort by zonedDateTime
	let sortedFlattenedData = $derived(
		flattenedData.sort(
			(a, b) => b.zonedDateTime.toDate().getTime() - a.zonedDateTime.toDate().getTime()
		)
	);

	let groupedData = $derived(groupByMonthDay(sortedFlattenedData));

	$inspect('timeline facilities', facilities);
	$inspect('timeline flattenedData', sortedFlattenedData);
	$inspect('timeline groupedData', groupedData);

	/**
	 * Get the background color for a fueltech
	 * @param {string} fueltech
	 * @returns {string}
	 */
	function getFueltechColor(fueltech) {
		return fuelTechColourMap[fueltech] || '#FFFFFF';
	}

	/**
	 * Get the region label
	 * @param {string} network_id
	 * @param {string} network_region
	 * @returns {string}
	 */
	function getRegionLabel(network_id, network_region) {
		if (network_region) {
			return regions.find((r) => r.value === network_region.toLowerCase())?.label || network_region;
		}
		return network_id?.toUpperCase();
	}

	$effect(() => {
		const el = document.querySelector(`#y2025`);
		if (el) {
			el.scrollIntoView({ behavior: 'instant', container: 'nearest' });
		}
	});
</script>

<div class="px-5">
	{#each [...groupedData] as [year, values]}
		<header
			id={`y${year}`}
			class="sticky top-0 bg-white/80 backdrop-blur-xs z-10 py-2 border-b border-mid-warm-grey"
		>
			<h2 class="font-space text-xl font-light m-0 p-0">{year}</h2>
		</header>
		{#each [...values] as [d, facilities]}
			{@const firstFacility = facilities[0]}
			{@const specificity = firstFacility.unit
				? firstFacility.unit[getDateField(firstFacility.unit.status_id) + '_specificity']
				: 'month'}

			<div class="pb-4 mb-8 relative grid grid-cols-12 gap-2">
				<header
					class="sticky top-[50px] self-start bg-white/80 backdrop-blur-xs z-5 py-2 mb-2 col-span-2"
				>
					{#if year != d}
						<h4
							class="font-space m-0 p-0 text-dark-grey"
							class:font-medium={specificity === 'year' || specificity === 'month'}
							class:font-light={specificity !== 'year' && specificity !== 'month'}
							class:text-base={specificity === 'year' || specificity === 'month'}
							class:text-xs={specificity !== 'year' && specificity !== 'month'}
						>
							{#if specificity === 'year'}
								{year}
							{:else}
								<!-- {specificity} -->
								{formatDateTime({
									date: firstFacility.zonedDateTime.toDate(),
									month: 'short',
									day: specificity === 'month' ? undefined : 'numeric',
									timeZone: firstFacility.zonedDateTime.timeZone
								})}
							{/if}
						</h4>
					{/if}
				</header>

				<ol class="flex flex-col col-span-10 border-l border-warm-grey bg-light-warm-grey">
					{#each facilities as facility}
						{@const isToday = facility.isToday}

						{#if isToday}
							<li>
								<div class="text-base font-medium text-dark-grey flex items-baseline gap-3">
									Today
								</div>
							</li>
						{:else}
							{@const bgColor = facility.unit
								? getFueltechColor(facility.unit.fueltech_id)
								: '#FFFFFF'}
							{@const path = `https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`}

							<li>
								<a
									class="grid grid-cols-12 items-center gap-2 pr-6 hover:no-underline hover:bg-warm-grey border-b border-warm-grey"
									target="_blank"
									href={path}
								>
									<div class="p-4 flex items-center gap-4 col-span-8">
										<div class="flex flex-col gap-1 items-center">
											<span
												class="rounded-full p-2 block"
												class:text-black={facility.unit.fueltech_id === 'solar_utility'}
												class:text-white={facility.unit.fueltech_id !== 'solar_utility'}
												style="background-color: {bgColor};"
											>
												<FuelTechIcon fuelTech={facility.unit.fueltech_id} sizeClass={8} />
											</span>
										</div>

										<div class="text-base font-medium text-dark-grey flex items-baseline gap-3">
											{facility.name || 'Unnamed Facility'}

											{#if facility.units.length > 1}
												<small class="text-mid-warm-grey text-xs font-light">
													({facility.unit.code})
												</small>
											{/if}
										</div>
									</div>

									<span class="text-xs text-mid-grey col-span-1">
										<!-- {facility.network_id || 'Unknown Network'} -->
										{getRegionLabel(facility.network_id, facility.network_region)}
									</span>

									<div class="col-span-3 grid grid-cols-7 items-center gap-2">
										<div class="flex justify-end items-baseline gap-1 col-span-6">
											<span class="font-mono text-base text-dark-grey">
												{numberFormatter.format(facility.unit.capacity_registered)}
											</span>
											<span class="text-xs font-mono text-mid-grey">MW</span>
										</div>

										<div class="col-span-1 flex justify-end">
											<FacilityStatusIcon status={facility.unit.status_id} />
										</div>
									</div>
								</a>
							</li>
						{/if}
					{/each}
				</ol>
			</div>
		{/each}
	{/each}
</div>
