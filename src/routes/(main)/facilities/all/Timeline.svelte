<script>
	import { parseAbsolute, today, getLocalTimeZone } from '@internationalized/date';
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { formatDateBySpecificity } from '$lib/utils/date-format';
	import { formatDateTime } from '$lib/utils/formatters';
	import formatValue from '../_utils/format-value';
	import groupByMonthDay from '../_utils/group-by-month-day';
	import getDateField from '../_utils/get-date-field';
	import FacilityUnitCard from '../_components/FacilityUnitCard.svelte';

	let { facilities = [], ontodaybuttonvisible, scrollContainer = null, onhover, hoveredFacility = null, clickedFacility = null } = $props();

	// Scroll to facility when clickedFacility changes (from map click)
	$effect(() => {
		if (clickedFacility && browser) {
			tick().then(() => {
				const el = document.querySelector(`[data-facility-code="${clickedFacility.code}"]`);
				el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			});
		}
	});

	/**
	 * @param {any} f
	 */
	function handleMouseEnter(f) {
		onhover?.(f);
	}

	function handleMouseLeave() {
		onhover?.(null);
	}

	let flattenedData = $derived.by(() => {
		/** @type {*[]} */
		let data = [
			{
				zonedDateTime: today(getLocalTimeZone()),
				isToday: true
			}
		];
		facilities.forEach((facility) => {
			const offset = facility.network_id === 'WEM' ? '+08:00' : '+10:00';
			facility.units.forEach((/** @type {*} */ unit) => {
				const dateField = getDateField(unit.status_id);
				const dateValue = unit[dateField];

				if (!dateValue) {
					console.log(unit.code, 'unit has no', dateField);
				} else {
					// Why convert?
					// The data is set in the CMS as UTC (should be a plain date string or?)
					// when returned from the API, it is converted to +10:00 and sometimes returned
					// as a Z date or a + date. (🤷🏻‍♂️)
					// - the date and time are also adjusted with +10:00 or +08:00 (🤷🏻‍♂️)
					// - e.g. commencement_date: "2025-12-15T14:00:00+10:00" this should be 2025-12-16T00:00:00+10:00 or better just 2025-12-16
					// - so to fix, we need to convert it back to UTC to get the date
					// - and then add the offset back on based on network_id (NEM or WEM) so we can sort the data correctly
					let parsedZonedDate = dateValue.includes('Z')
						? parseAbsolute(dateValue, offset)
						: parseAbsolute(dateValue.split('+')[0] + 'Z', offset); // e.g. 2025-12-15T14:00:00 -> 2025-12-16T00:00:00+10:00 (if NEM time)

					// this will order the data so year is first, then month, then day
					if (unit[dateField + '_specificity'] === 'month') {
						parsedZonedDate = parsedZonedDate.set({ day: 31 });
					} else if (unit[dateField + '_specificity'] === 'year') {
						parsedZonedDate = parsedZonedDate.set({
							month: 12,
							day: 31,
							hour: 23,
							minute: 59,
							second: 59
						});
					}

					data.push({
						...facility,
						zonedDateTime: parsedZonedDate,
						[dateField + '_formatted']: formatDateBySpecificity(
							unit[dateField],
							unit[dateField + '_specificity']
						),
						unit,
						isCommissioning: unit.isCommissioning
					});
				}
			});
		});
		return data;
	});

	// sort by zonedDateTime
	let sortedFlattenedData = $derived(
		flattenedData.sort(
			(a, b) => b.zonedDateTime?.toDate().getTime() - a.zonedDateTime?.toDate().getTime()
		)
	);

	let groupedData = $derived(groupByMonthDay(sortedFlattenedData));

	$effect(() => {
		// Depend on groupedData to re-run when data changes
		if (!browser || !scrollContainer || !groupedData) return;

		/** @type {IntersectionObserver | null} */
		let observer = null;
		let mounted = true;

		// Wait for DOM to update before querying for the element
		tick().then(() => {
			if (!mounted) return;

			const el = document.querySelector('#dToday');
			if (!el) return;

			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.boundingClientRect.top > 0) {
							ontodaybuttonvisible(!entry.isIntersecting, 'bottom');
						} else {
							ontodaybuttonvisible(!entry.isIntersecting, 'top');
						}
					});
				},
				{
					root: scrollContainer,
					threshold: 0
				}
			);

			observer.observe(el);
		});

		return () => {
			mounted = false;
			observer?.disconnect();
		};
	});

	$effect(() => {
		const el = document.querySelector('#dToday');
		if (el) {
			el.scrollIntoView({ behavior: 'auto', block: 'center' });
		}
	});

	export function jumpToToday() {
		const el = document.querySelector('#dToday');
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	/**
	 * @param {[string, any[]][]} values
	 * @returns {number}
	 */
	function getTotalCapacity(values) {
		let total = 0;
		values.forEach(([d, facilities]) => {
			facilities.forEach((/** @type {any} */ facility) => {
				// ignore today row as it's not a facility
				if (!facility.isToday) {
					if (facility.unit) {
						total += Number(facility.unit.capacity_maximum || facility.unit.capacity_registered);
					} else {
						console.log('facility has no unit', facility);
					}
				}
			});
		});
		return total;
	}
</script>

<div class="relative">
	<!-- <button
		onclick={handleGoToToday}
		class="absolute bottom-0 left-0 z-[9999] bg-white border border-warm-grey p-4"
	>
		Go to Today
	</button> -->
	<div>
		{#each [...groupedData] as [year, values], i}
			<header
				id={`y${year}`}
				class="sticky top-0 bg-white/80 backdrop-blur-xs z-10 py-2 px-4 border-b border-warm-grey flex justify-between items-baseline"
			>
				<h2 class="font-space text-base font-normal m-0 p-0">{year}</h2>
				<div class="mr-6 flex items-baseline gap-1">
					<span class="text-xs font-mono text-mid-grey">
						{formatValue(getTotalCapacity([...values]))}
					</span>
					<span class="text-xxs text-mid-grey">MW</span>
				</div>
			</header>

			{#each [...values] as [d, facilities]}
				{@const isToday = d === 'Today'}
				{@const firstFacility = facilities[0]}
				{@const specificity = firstFacility.unit
					? firstFacility.unit[getDateField(firstFacility.unit.status_id) + '_specificity']
					: 'month'}

				<div
					class="relative grid grid-cols-12 px-4"
					class:mx-0={isToday}
					class:my-4={!isToday}
					class:py-2={!isToday}
					id={`d${d}`}
				>
					<header
						class="sticky top-[50px] self-start z-5 py-2 mb-2 col-span-12"
						class:bg-white={!isToday}
						class:backdrop-blur-xs={!isToday}
					>
						{#if isToday}
							<h4
								class="inline font-space m-0 py-1 px-4 text-white bg-chart-1 font-medium text-[10px] relative -left-4 rounded-full"
							>
								Today
							</h4>
						{:else if year != d}
							<h4
								class="font-space m-0 p-0 text-base font-normal"
								class:text-base={specificity === 'year'}
								class:text-sm={specificity === 'month'}
								class:text-xxs={specificity !== 'year' && specificity !== 'month'}
								class:uppercase={specificity === 'year' || specificity === 'month'}
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

					{#if isToday}
						<div class="">
							<div
								class="bg-warm-grey w-full border-b border-chart-1 absolute top-[18px] z-0 left-0"
							></div>
						</div>
					{:else}
						<ol
							class="flex flex-col col-span-12 border border-mid-warm-grey rounded-lg divide-y divide-mid-warm-grey"
						>
							{#each facilities as facility}
								<FacilityUnitCard
									{facility}
									isHighlighted={hoveredFacility?.code === facility.code}
									onmouseenter={handleMouseEnter}
									onmouseleave={handleMouseLeave}
								/>
							{/each}
						</ol>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>
