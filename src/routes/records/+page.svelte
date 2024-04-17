<script>
	/** @typedef {import('$lib/types/filters.types').TechnologyFilterDict} TechnologyFilterDict */
	/** @typedef {import('$lib/types/filters.types').TechnologyFilterKey} TechnologyFilterKey  */
	/** @typedef {import('$lib/types/record.types').Record} Record  */
	/** @typedef {import('./$types').PageData} PageData  */

	import { format, isToday } from 'date-fns';

	import FilterContent from '$lib/components/filters/FilterContent.svelte';
	import FilterSection from '$lib/components/filters/FilterSection.svelte';
	import FilterSectionHead from '$lib/components/filters/FilterSectionHead.svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import RadioBigButton from '$lib/components/form-elements/RadioBigButton.svelte';
	import TextInput from '$lib/components/form-elements/TextInput.svelte';
	import Button from '$lib/components/form-elements/Button.svelte';
	import RecordCard from '$lib/components/records/RecordCard.svelte';
	import {
		technologyFilters,
		technologyDefaultSelections,
		regionFilters,
		regionDefaultSelections,
		peakLowFilters
	} from '$lib/filters';
	import { recordsByDay } from '$lib/records';
	import { getKeys } from '$lib/utils/keys';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Meta from '$lib/components/Meta.svelte';

	/** @type {PageData} */
	export let data;

	const PAGE_LENGTH = 50;
	let recordsData = data.records;
	let currentPage = 1;

	// Grab defaults from URL if present
	let pURL = $page.url;
	let technologyArgs = pURL.searchParams
		.get('technologies')
		?.split('+')
		.reduce((acc, current) => {
			acc[current] = true;
			return acc;
		}, {});

	let regionArgs = pURL.searchParams
		.get('region')
		?.split('+')
		.reduce((acc, current) => {
			acc[current] = true;
			return acc;
		}, {});

	let isLoading = false;

	let showMenu = false;
	let showTechnology = false;
	let showRegions = false;
	let showPeakLow = false;
	let showDate = false;
	let showLoadMore = data.count > PAGE_LENGTH;

	let searchString = pURL.searchParams.get('search') || '';
	/** @type {TechnologyFilterDict} */
	let technologySelections = { ...technologyDefaultSelections, ...technologyArgs };
	let regionSelections = { ...regionDefaultSelections, ...regionArgs };
	let peakLowSelection = pURL.searchParams.get('peak-low') || 'all';
	let dateSelection = pURL.searchParams.get('date') || 'none';
	let dateChosen = 'none';

	$: hasSearchTerm = searchString.trim() !== '';
	$: hasTechnologySelections = Object.values(technologySelections).find((selection) => selection);
	$: hasRegionSelections = Object.values(regionSelections).find((selection) => selection);
	$: hasFilters =
		hasSearchTerm || hasTechnologySelections || hasRegionSelections || peakLowSelection !== 'all';

	$: recordsFilter = (/** @type {Record[]} */ records) =>
		records?.filter((/** @type {Record} */ record) => {
			const searchFilter =
				!record.description ||
				record.description.toLowerCase().includes(searchString.toLowerCase());
			const technologyFilter =
				technologySelections[/** @type {keyof TechnologyFilterDict} */ (record.fueltech)] ||
				!hasTechnologySelections;
			const regionFilter =
				regionSelections[record.network_region] ||
				regionSelections[record.network] ||
				!hasRegionSelections;
			const peakLowFilter = peakLowSelection === 'all' || record.record_type === peakLowSelection;

			return searchFilter && technologyFilter && regionFilter && peakLowFilter;
		});

	$: filteredRecords = recordsFilter(recordsData) || [];
	$: dailyRecords = recordsByDay(filteredRecords);

	const fetchRecords = async (pageNum = -1) => {
		isLoading = true;

		let p = [];
		if (dateSelection !== 'none') {
			p.push(`date=${dateSelection}`);
		}
		if (pageNum > 0) {
			p.push(`page=${pageNum}`);
		}

		const params = p.length ? `?${p.join('&')}` : '';
		const resp = await fetch(`/api/records${params}`);
		if (resp && resp.ok) {
			const recordsResponse = await resp.json();
			if (pageNum > 0) {
				currentPage = pageNum;
				recordsData = [...recordsData, ...recordsResponse.data];
			} else {
				recordsData = recordsResponse.data;
			}

			if (recordsResponse.data.length >= PAGE_LENGTH) {
				showLoadMore = true;
			} else {
				showLoadMore = false;
			}
		}

		isLoading = false;
	};

	const clearAllFilters = () => {
		getKeys(technologySelections).forEach((technology) => {
			technologySelections[technology] = false;
		});

		getKeys(regionSelections).forEach((region) => {
			regionSelections[region] = false;
		});

		peakLowSelection = 'all';
		searchString = '';
		setQueryString();
	};

	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement>} */
	const fuelTechChange = (e) => {
		const { name, checked } = e.currentTarget;

		if (name === 'renewables' || name === 'non-renewables') {
			getKeys(technologyFilters).forEach((technologyKey) => {
				if (technologyFilters[technologyKey].renewable === (name === 'renewables')) {
					technologySelections[technologyKey] = checked;
				}
			});
		} else {
			if (technologyFilters[/** @type {TechnologyFilterKey} */ (name)].renewable) {
				technologySelections['renewables'] = false;
			} else {
				technologySelections['non-renewables'] = false;
			}
		}

		technologySelections[/** @type {TechnologyFilterKey} */ (name)] = checked;
		setQueryString();
	};

	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement>} */
	const regionChange = (e) => {
		const { name, checked } = e.currentTarget;
		regionSelections[name] = checked;
		setQueryString();
	};

	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement>} */
	const handlePeakLow = (e) => {
		const { name, value } = e.currentTarget;
		peakLowSelection = value;
		setQueryString();
	};

	const setQueryString = () => {
		const newUrl = new URL($page.url);
		newUrl.hash = '';
		newUrl.search = '';

		const technologies = getKeys(technologySelections)
			.filter((technology) => technologySelections[technology])
			.join('+');

		const regions = getKeys(regionSelections)
			.filter((region) => regionSelections[region])
			.join('+');

		if (searchString.trim() !== '') {
			newUrl?.searchParams.set('search', searchString.trim());
		}

		if (peakLowSelection !== 'all') {
			newUrl?.searchParams.set('peak-low', peakLowSelection);
		}

		if (dateSelection !== 'none') {
			newUrl?.searchParams.set('date', dateSelection);
		}

		technologies && newUrl?.searchParams.set('technologies', technologies);
		regions && newUrl?.searchParams.set('regions', regions);

		history.replaceState(history.state, '', newUrl);
	};
</script>

<Meta
	title="Records"
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>

<div class="bg-warm-grey">
	<div class="container max-w-none lg:container">
		<div class="block md:flex gap-8">
			<div
				class="records-sidebar-fill records-sidebar min-w-[27rem] w-full md:w-3/12 bg-white py-8 md:py-14 md:pr-8 relative border-solid md:border-r-[0.05rem] border-mid-warm-grey"
			>
				<div class="flex justify-between">
					<h1 class="text-2xl leading-2xl md:text-3xl md:leading-3xl mb-0">Records</h1>
					<Button
						secondary={true}
						class="text-black flex-shrink-0 w-16 h-16 flex justify-center align-middle md:hidden"
						active={showMenu}
						clickHandler={() => {
							showMenu = !showMenu;
						}}><Icon icon="filter" /></Button
					>
				</div>
				<div class={`${showMenu ? 'block' : 'hidden'} md:block`}>
					<FilterSectionHead
						title="Filters"
						clearTitle="Clear all"
						{hasFilters}
						clearHandler={clearAllFilters}
					/>
					<div>
						<FilterSection>
							<FilterContent>
								<TextInput
									class="w-full bg-[url('/img/search.svg')] bg-no-repeat bg-[center_left_1rem] pl-14"
									placeholder="Search all records"
									value={searchString}
									changeHandler={(e) => {
										searchString = e.currentTarget.value;
										setQueryString();
									}}
								/>
							</FilterContent>
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Technology"
								isOpen={showTechnology}
								toggleHandler={() => (showTechnology = !showTechnology)}
								hasFilters={hasTechnologySelections}
								clearHandler={() => {
									getKeys(technologySelections).forEach((technology) => {
										technologySelections[technology] = false;
									});
									setQueryString();
								}}
							/>
							{#if showTechnology}
								<FilterContent>
									<ul>
										<li class="mb-4">
											<Checkbox
												name="renewables"
												label="Renewables"
												changeHandler={fuelTechChange}
												checked={technologySelections['renewables']}
											/>
											<ul class="ml-8">
												{#each getKeys(technologyFilters).filter((t) => technologyFilters[t].renewable) as technology}
													<li>
														<Checkbox
															name={technology}
															label={technologyFilters[technology].label}
															changeHandler={fuelTechChange}
															checked={technologySelections[technology]}
														/>
													</li>
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
												{#each getKeys(technologyFilters).filter((t) => !technologyFilters[t].renewable) as technology}
													<li>
														<Checkbox
															name={technology}
															label={technologyFilters[technology].label}
															changeHandler={fuelTechChange}
															checked={technologySelections[technology]}
														/>
													</li>
												{/each}
											</ul>
										</li>
									</ul>
								</FilterContent>
							{/if}
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Regions"
								isOpen={showRegions}
								toggleHandler={() => (showRegions = !showRegions)}
								hasFilters={hasRegionSelections}
								clearHandler={() => {
									getKeys(regionSelections).forEach((region) => {
										regionSelections[region] = false;
									});
									setQueryString();
								}}
							/>
							{#if showRegions}
								<FilterContent>
									<ul>
										{#each getKeys(regionFilters) as region}
											<li>
												<Checkbox
													name={region}
													label={regionFilters[region].label}
													changeHandler={regionChange}
													checked={regionSelections[region]}
												/>
											</li>
										{/each}
									</ul>
								</FilterContent>
							{/if}
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Peak/Low"
								isOpen={showPeakLow}
								toggleHandler={() => (showPeakLow = !showPeakLow)}
								hasFilters={peakLowSelection !== 'all'}
								clearHandler={() => {
									peakLowSelection = 'all';
									setQueryString();
								}}
							/>
							{#if showPeakLow}
								<FilterContent>
									<div class="flex gap-4">
										{#each getKeys(peakLowFilters) as peakLow}
											<RadioBigButton
												name="peak_low"
												label={peakLowFilters[peakLow].label}
												value={peakLow}
												changeHandler={handlePeakLow}
												checked={peakLowSelection === peakLow}
											/>
										{/each}
									</div>
								</FilterContent>
							{/if}
						</FilterSection>
						<FilterSection>
							<FilterSectionHead
								title="Date"
								isOpen={showDate}
								toggleHandler={() => (showDate = !showDate)}
								hasFilters={dateSelection !== 'none'}
								clearHandler={() => {
									dateSelection = 'none';
									dateChosen = 'none';
									setQueryString();
									fetchRecords();
								}}
							/>
							{#if showDate}
								<FilterContent>
									<div class="flex gap-4">
										<TextInput
											type="date"
											class="appearance-none w-full bg-no-repeat"
											value={dateChosen !== 'none'
												? format(new Date(dateChosen), 'yyyy-MM-dd')
												: dateSelection !== 'none'
												? format(new Date(dateSelection), 'yyyy-MM-dd')
												: ''}
											changeHandler={(e) => {
												dateChosen = e.currentTarget.value;
												setQueryString();
											}}
										/>
									</div>
									{#if dateChosen !== 'none'}
										<div class="py-8 grid gap-4 grid-cols-2">
											<Button
												secondary={true}
												clickHandler={() => {
													dateChosen = dateSelection;
													currentPage = 1;
													setQueryString();
													fetchRecords();
												}}>Cancel</Button
											>
											<Button
												clickHandler={(e) => {
													dateSelection = dateChosen;
													dateChosen = 'none';
													currentPage = 1;
													setQueryString();
													fetchRecords();
												}}>Apply</Button
											>
										</div>
									{/if}
								</FilterContent>
							{/if}
						</FilterSection>
					</div>
				</div>
			</div>
			<div class="flex-grow pt-6 pb-16">
				{#each dailyRecords as day}
					<div class="max-w-[51rem] mx-auto">
						<header class="font-space text-sm uppercase py-8 sticky top-0 z-20 bg-warm-grey">
							{isToday(Date.parse(day[0][0].interval))
								? 'Today'
								: format(Date.parse(day[0][0].interval), 'dd LLL, yyyy')}
						</header>
						<div>
							{#each day as record}
								<RecordCard {record} class="mb-4" />
							{/each}
						</div>
					</div>
				{/each}
				{#if showLoadMore}
					<div class="flex justify-center my-16">
						<Button
							clickHandler={() => {
								fetchRecords(currentPage + 1);
							}}
							secondary={true}
							disabled={isLoading}>Load more</Button
						>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
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
	.records-sidebar-fill:after {
		content: '';
		display: block;
		width: 100vh;
		height: 100%;
		position: absolute;
		left: 100%;
		top: 0;
		background-color: white;
	}
	@media (min-width: theme(screens.md)) {
		.records-sidebar-fill:after {
			display: none;
		}
	}
</style>
