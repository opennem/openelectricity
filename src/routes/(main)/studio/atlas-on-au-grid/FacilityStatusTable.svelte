<script>
	import { formatDateBySpecificity } from '$lib/utils/date-format';
	import ChevronDown from '$lib/icons/ChevronDown.svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';

	/**
	 * @typedef {Object} Props
	 * @property {any[]} facilities
	 * @property {string} statusLabel
	 * @property {'committed' | 'operating' | 'retired'} statusType
	 */

	/** @type {Props} */
	let { facilities = [], statusLabel = 'Facilities', statusType = 'operating' } = $props();

	// Track whether the facility list is shown (collapsed by default for operating and retired)
	let showFacilityList = $state(false);

	// Track which facilities have their units table expanded
	/** @type {Record<string, boolean>} */
	let expandedFacilities = $state({});

	/**
	 * Toggle the facility list visibility
	 */
	function toggleFacilityList() {
		showFacilityList = !showFacilityList;
	}

	/**
	 * Toggle the expanded state for a facility
	 * @param {string} facilityId
	 */
	function toggleFacility(facilityId) {
		expandedFacilities[facilityId] = !expandedFacilities[facilityId];
	}

	/**
	 * Get the relevant date field name based on status type
	 * @returns {string}
	 */
	function getDateField() {
		switch (statusType) {
			case 'committed':
				return 'expected_operation_date';
			case 'operating':
				return 'commencement_date';
			case 'retired':
				return 'closure_date';
			default:
				return 'commencement_date';
		}
	}

	/**
	 * Get unique fuel techs with their earliest relevant date for a facility
	 * @param {any} facility
	 * @returns {Array<{fueltech: string, date: string | null, specificity: string | null}>}
	 */
	function getFuelTechTags(facility) {
		if (!facility.units || facility.units.length === 0) return [];

		const dateField = getDateField();
		const specificityField = `${dateField}_specificity`;
		const fuelTechMap = new Map();

		facility.units.forEach((/** @type {any} */ unit) => {
			const fueltech = unit.fueltech_id;
			if (!fueltech) return;

			const date = unit[dateField];
			const specificity = unit[specificityField];

			if (!fuelTechMap.has(fueltech)) {
				fuelTechMap.set(fueltech, { date, specificity });
			} else {
				// Keep the earliest date
				const existing = fuelTechMap.get(fueltech);
				if (date && (!existing.date || new Date(date) < new Date(existing.date))) {
					fuelTechMap.set(fueltech, { date, specificity });
				}
			}
		});

		return Array.from(fuelTechMap.entries()).map(([fueltech, { date, specificity }]) => ({
			fueltech,
			date,
			specificity
		}));
	}

	/**
	 * Get the background color for a fueltech
	 * @param {string} fueltech
	 * @returns {string}
	 */
	function getFueltechColor(fueltech) {
		return fuelTechColourMap[fueltech] || '#FFFFFF';
	}

	/**
	 * Determine if a color is dark and needs light text
	 * @param {string} hexColor
	 * @returns {boolean}
	 */
	function isColorDark(hexColor) {
		// Convert hex to RGB
		const hex = hexColor.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);

		// Calculate relative luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		return luminance < 0.5;
	}

	/**
	 * Get the latest relevant date for a facility (for sorting)
	 * @param {any} facility
	 * @returns {Date | null}
	 */
	function getFacilityRelevantDate(facility) {
		if (!facility.units || facility.units.length === 0) return null;

		const dateField = getDateField();
		/** @type {Date | null} */
		let latestDate = null;

		facility.units.forEach((/** @type {any} */ unit) => {
			const dateValue = unit[dateField];
			if (dateValue) {
				const date = new Date(dateValue);
				if (!isNaN(date.getTime()) && (!latestDate || date > latestDate)) {
					latestDate = date;
				}
			}
		});

		return latestDate;
	}

	// Sort facilities by their relevant date (latest to oldest)
	let sortedFacilities = $derived(
		[...facilities].sort((a, b) => {
			const dateA = getFacilityRelevantDate(a);
			const dateB = getFacilityRelevantDate(b);

			// Facilities without dates go to the end
			if (!dateA && !dateB) return 0;
			if (!dateA) return 1;
			if (!dateB) return -1;

			// Sort by date descending (latest first)
			return dateB.getTime() - dateA.getTime();
		})
	);
</script>

<section class="md:container mb-4">
	<header class="flex items-center gap-6 bg-warm-grey rounded-xl pl-4 pr-6 py-1 relative z-20">
		<!-- Toggle Facility List Button -->
		<button
			onclick={toggleFacilityList}
			class="flex-shrink-0 p-1.5 hover:bg-light-warm-grey rounded group"
			aria-label={showFacilityList ? 'Hide facility list' : 'Show facility list'}
			title={showFacilityList ? 'Hide facility list' : 'Show facility list'}
		>
			<div class="transition-transform duration-200" class:-rotate-90={!showFacilityList}>
				<ChevronDown />
			</div>
		</button>

		<div class="flex-1 flex justify-between items-center gap-1">
			<h2 class="text-sm font-medium font-space text-dark-grey m-0 p-0">{statusLabel}</h2>
			<p class="text-xs text-mid-grey m-0 p-0">
				Total: {facilities.length} facilities
			</p>
		</div>
	</header>

	<div class="bg-light-warm-grey rounded-b-xl pb-1 pt-6 relative -top-6 z-10">
		{#if !showFacilityList}
			<!-- Hidden state - show nothing or a minimal indicator -->
		{:else if facilities.length === 0}
			<p class="text-gray-500 italic">No facilities found</p>
		{:else}
			<div class="space-y-1">
				{#each sortedFacilities as facility, index (facility.code || facility.name)}
					{@const facilityId = facility.code || facility.name}
					{@const isExpanded = expandedFacilities[facilityId] || false}
					{@const fuelTechTags = getFuelTechTags(facility)}

					<div class="border-b border-warm-grey overflow-hidden">
						<div class="px-4 py-1">
							<div class="flex items-center gap-6">
								<!-- Expand Button -->
								<button
									onclick={() => toggleFacility(facilityId)}
									class="flex-shrink-0 p-1.5 hover:bg-light-warm-grey rounded group block w-[24px]"
									aria-label={isExpanded ? 'Hide units' : 'Show units'}
								>
									<span class="block group-hover:hidden">
										{index + 1}
									</span>
									<div
										class="transition-transform duration-200 hidden group-hover:block"
										class:-rotate-90={!isExpanded}
									>
										<ChevronDown />
									</div>
								</button>

								<!-- Facility Name and Location -->
								<div class="flex items-center gap-2 w-[30%] justify-between">
									<span class="text-sm font-medium text-dark-grey truncate">
										{facility.name || 'Unnamed Facility'}
									</span>
									<span class="text-xs text-mid-grey truncate">
										{facility.network_id || 'Unknown Network'}
										{#if facility.network_region}
											• {facility.network_region}
										{/if}
									</span>
								</div>

								<!-- Fuel Tech Tags - scrollable horizontally if needed -->
								{#if fuelTechTags.length > 0}
									<div class="flex-1 min-w-0 overflow-x-auto">
										<div class="flex gap-2 items-center">
											{#each fuelTechTags as { fueltech, date, specificity }}
												{@const bgColor = getFueltechColor(fueltech)}
												{@const useLightText = isColorDark(bgColor)}
												<span
													class="inline-flex items-center gap-1 px-2.5 py-1 border border-warm-grey rounded-xl text-xs whitespace-nowrap flex-shrink-0"
													style="background-color: {bgColor};"
													class:text-white={useLightText}
													class:text-dark-grey={!useLightText}
												>
													<span class="font-medium">{fueltech}</span>
													{#if date}
														<span
															class:text-white={useLightText}
															class:text-mid-grey={!useLightText}
														>
															• {formatDateBySpecificity(date, specificity)}
														</span>
													{/if}
												</span>
											{/each}
										</div>
									</div>
								{:else}
									<div class="flex-1"></div>
								{/if}
							</div>
						</div>

						{#if isExpanded}
							<div class="border-t border-gray-200">
								<div class="overflow-x-auto">
									<table class="w-full text-sm">
										<thead class="bg-gray-100">
											<tr class="border-b border-gray-200">
												<th class="px-3 py-2 text-left font-semibold text-xs">Unit Code</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Fuel Tech</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Status</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Dispatch Type</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Expected Op.</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Commencement</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Closure</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Expected Closure</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Data First Seen</th>
												<th class="px-3 py-2 text-left font-semibold text-xs">Data Last Seen</th>
											</tr>
										</thead>
										<tbody class="bg-white">
											{#if facility.units && facility.units.length > 0}
												{#each facility.units as unit}
													<tr class="border-b border-gray-100 hover:bg-gray-50">
														<td class="px-3 py-2 font-mono text-xs">
															{unit.code || '-'}
														</td>
														<td class="px-3 py-2 text-xs">
															{unit.fueltech_id || '-'}
														</td>
														<td class="px-3 py-2">
															<span
																class="px-2 py-0.5 rounded text-xs font-medium"
																class:bg-green-100={unit.status_id === 'operating'}
																class:text-green-800={unit.status_id === 'operating'}
																class:bg-blue-100={unit.status_id === 'committed'}
																class:text-blue-800={unit.status_id === 'committed'}
																class:bg-gray-100={unit.status_id === 'retired'}
																class:text-gray-800={unit.status_id === 'retired'}
															>
																{unit.status_id || '-'}
															</span>
														</td>
														<td class="px-3 py-2 text-xs">
															{unit.dispatch_type || '-'}
														</td>
														<td class="px-3 py-2 text-xs">
															{formatDateBySpecificity(
																unit.expected_operation_date,
																unit.expected_operation_date_specificity
															)}
														</td>
														<td class="px-3 py-2 text-xs">
															{formatDateBySpecificity(
																unit.commencement_date,
																unit.commencement_date_specificity
															)}
														</td>
														<td class="px-3 py-2 text-xs">
															{formatDateBySpecificity(
																unit.closure_date,
																unit.closure_date_specificity
															)}
														</td>
														<td class="px-3 py-2 text-xs">
															{formatDateBySpecificity(
																unit.expected_closure_date,
																unit.expected_closure_date_specificity
															)}
														</td>
														<td class="px-3 py-2 text-xs">
															{formatDateBySpecificity(unit.data_first_seen, 'day')}
														</td>
														<td class="px-3 py-2 text-xs">
															{formatDateBySpecificity(unit.data_last_seen, 'day')}
														</td>
													</tr>
												{/each}
											{:else}
												<tr>
													<td
														colspan="10"
														class="px-3 py-2 text-center text-gray-500 italic text-xs"
													>
														No units found
													</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
