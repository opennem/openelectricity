<script>
	import FilterSection from '$lib/components/filters/FilterSection.svelte';
	import FilterSectionHead from '$lib/components/filters/FilterSectionHead.svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import TextInput from '$lib/components/form-elements/TextInput.svelte';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import { technologyFilters } from '$lib/filters';
	import { recordsByDay } from '$lib/records';
	import { format, isToday } from 'date-fns';

	/** @type {import('./$types').PageData} */
	export let data;

	let showTechnology = false;
	let showRegions = false;
	let showPeakLow = false;
	let searchString = '';

	$: technologySelections = Object.keys(technologyFilters).reduce(
		(accumulator, key) => {
			accumulator[key] = false;
			return accumulator;
		},
		{
			renewables: false,
			'non-renewables': false
		}
	);

	$: hasSearchTerm = searchString.trim() !== '';
	$: hasTechnologySelections = Object.values(technologySelections).find((selection) => selection);
	$: hasFilters = hasSearchTerm || hasTechnologySelections;

	$: filteredRecords = data.records.filter(
		(/** @type {import('$lib/types/record.types').Record} */ record) => {
			const searchFilter = record.description.toLowerCase().includes(searchString.toLowerCase());
			const technologyFilter = technologySelections[record.fuel_tech] || !hasTechnologySelections;

			return searchFilter && technologyFilter;
		}
	);

	$: dailyRecords = recordsByDay(filteredRecords);

	const clearAllFilters = () => {
		Object.keys(technologySelections).forEach((technology) => {
			technologySelections[technology] = false;
		});

		searchString = '';
	};

	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement>} */
	const fuelTechChange = (e) => {
		const { name, checked } = e.currentTarget;

		if (name === 'renewables' || name === 'non-renewables') {
			Object.keys(technologyFilters).forEach((technologyKey) => {
				if (technologyFilters[technologyKey].renewable === (name === 'renewables')) {
					technologySelections[technologyKey] = checked;
				}
			});
		} else {
			if (technologyFilters[name].renewable) {
				technologySelections['renewables'] = false;
			} else {
				technologySelections['non-renewables'] = false;
			}
		}

		technologySelections[name] = checked;
	};
</script>

<div class="bg-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="flex gap-8">
			<div
				class="records-sidebar min-w-[27rem] w-3/12 bg-white py-14 pr-8 relative border-solid border-r-[0.05rem] border-mid-warm-grey"
			>
				<h1 class="text-2xl leading-2xl md:text-3xl md:leading-3xl">Records</h1>
				<div>
					<FilterSectionHead
						title="Filters"
						clearTitle="Clear all"
						{hasFilters}
						clearHandler={clearAllFilters}
					/>
					<main>
						<FilterSection>
							<TextInput
								class="w-full bg-[url('/img/search.svg')] bg-no-repeat bg-[center_left_1rem] pl-14"
								placeholder="Search all records"
								value={searchString}
								changeHandler={(e) => {
									searchString = e.currentTarget.value;
								}}
							/>
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Technology"
								isOpen={showTechnology}
								toggleHandler={() => (showTechnology = !showTechnology)}
								hasFilters={hasTechnologySelections}
								clearHandler={() => {
									Object.keys(technologySelections).forEach((technology) => {
										technologySelections[technology] = false;
									});
								}}
							/>
							{#if showTechnology}
								<main class="py-8">
									<ul>
										<li class="mb-4">
											<Checkbox
												name="renewables"
												label="Renewables"
												changeHandler={fuelTechChange}
												checked={technologySelections['renewables']}
											/>
											<ul class="ml-8">
												{#each Object.keys(technologyFilters) as technology}
													{#if technologyFilters[technology].renewable}
														<li>
															<Checkbox
																name={technology}
																label={technologyFilters[technology].label}
																changeHandler={fuelTechChange}
																checked={technologySelections[technology]}
															/>
														</li>
													{/if}
												{/each}
											</ul>
										</li>
										<li>
											<Checkbox
												name="non-renewables"
												label="Non-renewables"
												changeHandler={fuelTechChange}
												checked={technologySelections['non-renewables']}
											/>
											<ul class="ml-8">
												{#each Object.keys(technologyFilters) as technology}
													{#if !technologyFilters[technology].renewable}
														<li>
															<Checkbox
																name={technology}
																label={technologyFilters[technology].label}
																changeHandler={fuelTechChange}
																checked={technologySelections[technology]}
															/>
														</li>
													{/if}
												{/each}
											</ul>
										</li>
									</ul>
								</main>
							{/if}
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Regions"
								isOpen={showRegions}
								toggleHandler={() => (showRegions = !showRegions)}
							/>
							<main />
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Peak/Low"
								isOpen={showPeakLow}
								toggleHandler={() => (showPeakLow = !showPeakLow)}
							/>
							<main />
						</FilterSection>
					</main>
				</div>
			</div>
			<div class="flex-grow pt-6 pb-16">
				{#each dailyRecords as day}
					<div class="max-w-[51rem] mx-auto">
						<header class="font-space text-sm uppercase py-8 sticky top-0 z-50 bg-warm-grey">
							{isToday(Date.parse(day[0][0].time))
								? 'Today'
								: format(Date.parse(day[0][0].time), 'dd LLL, yyyy')}
						</header>
						<div>
							{#each day as record}
								<RecordCard {record} class="mb-4" />
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.records-sidebar:before {
		content: '';
		display: block;
		width: 100vh;
		height: 100%;
		position: absolute;
		right: 100%;
		top: 0;
		background-color: white;
	}
</style>
