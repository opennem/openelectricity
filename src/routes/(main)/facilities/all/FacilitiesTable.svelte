<script>
	import { formatDateBySpecificity } from '$lib/utils/date-format';
	import ChevronDown from '$lib/icons/ChevronDown.svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';

	/**
	 * @typedef {Object} Props
	 * @property {any[]} facilities
	 */

	/** @type {Props} */
	let { facilities = [] } = $props();

	// Track which facilities have their units table expanded
	/** @type {Record<string, boolean>} */
	let expandedFacilities = $state({});

	/**
	 * Toggle the expanded state for a facility
	 * @param {string} facilityId
	 */
	function toggleFacility(facilityId) {
		expandedFacilities[facilityId] = !expandedFacilities[facilityId];
	}

	/**
	 * Get unique fuel techs for a facility
	 * @param {any} facility
	 * @returns {Array<{fueltech: string}>}
	 */
	function getFuelTechTags(facility) {
		if (!facility.units || facility.units.length === 0) return [];

		const fuelTechSet = new Set();
		facility.units.forEach((/** @type {any} */ unit) => {
			const fueltech = unit.fueltech_id;
			if (fueltech) {
				fuelTechSet.add(fueltech);
			}
		});

		return Array.from(fuelTechSet).map((fueltech) => ({ fueltech }));
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

	// Sort facilities by name
	let sortedFacilities = $derived(
		[...facilities].sort((a, b) => {
			const nameA = (a.name || '').toLowerCase();
			const nameB = (b.name || '').toLowerCase();
			return nameA.localeCompare(nameB);
		})
	);
</script>

<div class="bg-white h-full">
	{#if facilities.length === 0}
		<p class="text-gray-500 italic p-4">No facilities found</p>
	{:else}
		<div class="space-y-1 p-2">
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
										{#each fuelTechTags as { fueltech }}
											{@const bgColor = getFueltechColor(fueltech)}
											{@const useLightText = isColorDark(bgColor)}
											<span
												class="inline-flex items-center gap-1 px-2.5 py-1 border border-warm-grey rounded-xl text-xs whitespace-nowrap flex-shrink-0"
												style="background-color: {bgColor};"
												class:text-white={useLightText}
												class:text-dark-grey={!useLightText}
											>
												<span class="font-medium">{fueltech}</span>
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

