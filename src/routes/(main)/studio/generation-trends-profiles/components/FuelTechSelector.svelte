<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {Array<{value: string, label: string}>} fuelTechOptions - Available fuel tech options
	 * @property {string[]} selectedFuelTechs - Currently selected fuel technologies
	 * @property {Object.<string, string>} fuelTechLabels - Mapping of fuel tech keys to display labels
	 * @property {Function} onFuelTechChange - Callback for fuel tech selection changes
	 */

	/** @type {Props} */
	let { fuelTechOptions, selectedFuelTechs, fuelTechLabels, onFuelTechChange } = $props();
</script>

<div class="bg-white border-b border-gray-200 py-4">
	<div class="container mx-auto px-4">
		<div class="space-y-4">
			<!-- Selected fuel tech tags -->
			{#if selectedFuelTechs.length > 0}
				<div>
					<h6 class="text-xs text-gray-600 mb-2">Selected</h6>
					<div class="flex flex-wrap gap-2">
						{#each selectedFuelTechs as fuelTech (fuelTech)}
							<div
								class="bg-white border border-warm-grey text-xs leading-xs rounded-full flex justify-between items-center gap-3 pl-5 py-1 md:py-0"
							>
								<span class="whitespace-nowrap">{fuelTechLabels[fuelTech]}</span>
								<button
									class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
									onclick={() => {
										onFuelTechChange(fuelTech, false);
									}}
									aria-label="Remove {fuelTechLabels[fuelTech]}"
								>
									<IconXMark class="size-6" />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Fuel Technology Selector -->
			<div>
				<FormMultiSelect
					options={fuelTechOptions}
					selected={selectedFuelTechs}
					label="Fuel Technology"
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => onFuelTechChange(value, isMetaPressed)}
				/>
			</div>
		</div>
	</div>
</div>
