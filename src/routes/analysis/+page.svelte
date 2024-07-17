<script>
	import { onMount } from 'svelte';
	import { format } from 'date-fns';
	import FilterContent from '$lib/components/filters/FilterContent.svelte';
	import FilterSection from '$lib/components/filters/FilterSection.svelte';
	import FilterSectionHead from '$lib/components/filters/FilterSectionHead.svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import TextInput from '$lib/components/form-elements/TextInput.svelte';
	import Button from '$lib/components/form-elements/Button.svelte';
	import {
		technologyFilters,
		technologyDefaultSelections,
		regionFilters,
		regionDefaultSelections
	} from '$lib/filters';
	import { getKeys } from '$lib/utils/keys';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import Meta from '$lib/components/Meta.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	let showMenu = false;

	// Grab defaults from URL if present
	let pURL = null;
	let technologyArgs = null;

	let regionArgs = null;

	let showTechnology = false;
	let showRegions = false;
	let showDate = false;
	let searchString = '';

	/** @type {*} */
	let technologySelections = null;
	/** @type {*} */
	let regionSelections = null;
	let dateChosen = 'none';

	onMount(() => {
		pURL = $page.url;

		technologyArgs = pURL.searchParams
			.get('technologies')
			?.split('+')
			.reduce((acc, current) => {
				acc[current] = true;
				return acc;
			}, {});

		regionArgs = pURL.searchParams
			.get('region')
			?.split('+')
			.reduce((acc, current) => {
				acc[current] = true;
				return acc;
			}, {});

		searchString = pURL.searchParams.get('search') || '';

		technologySelections = { ...technologyDefaultSelections, ...technologyArgs };
		regionSelections = { ...regionDefaultSelections, ...regionArgs };
	});

	$: hasSearchTerm = searchString.trim() !== '';
	$: hasTechnologySelections = technologySelections
		? Object.values(technologySelections).find((selection) => selection)
		: false;
	$: hasRegionSelections = regionSelections
		? Object.values(regionSelections).find((selection) => selection)
		: false;
	$: hasFilters = hasSearchTerm || hasTechnologySelections || hasRegionSelections;

	$: articlesFilter = (/** @type {Article[]} */ articles) =>
		articles?.filter((article) => {
			const searchFilter =
				article.title.toLowerCase().includes(searchString.toLowerCase()) || 
				article.author.some(author => author.name.toLocaleLowerCase().includes(searchString.toLocaleLowerCase())) ||
				searchString.trim() === '';
			const technologyFilter = technologySelections
				? technologySelections[article.fueltech] || !hasTechnologySelections
				: false;
			const regionFilter = regionSelections
				? regionSelections[article.region] || !hasRegionSelections
				: false;
			const dateFilter = article.publish_date === dateChosen || dateChosen === 'none';

			return searchFilter && technologyFilter && regionFilter && dateFilter;
		});

	$: filteredArticles = articlesFilter(data.articles) || [];

	const clearAllFilters = () => {
		getKeys(technologySelections).forEach((technology) => {
			technologySelections[technology] = false;
		});

		getKeys(regionSelections).forEach((region) => {
			regionSelections[region] = false;
		});

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

		if (dateChosen !== 'none') {
			newUrl?.searchParams.set('date', dateChosen);
		}

		technologies && newUrl?.searchParams.set('technologies', technologies);
		regions && newUrl?.searchParams.set('regions', regions);

		history.replaceState(history.state, '', newUrl);
	};
</script>

<Meta
	title="Analysis"
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>

<div>
	<div class="container max-w-none lg:container">
		<div class="block md:flex gap-8">
			<div
				class="records-sidebar-fill records-sidebar min-w-[27rem] w-full md:w-3/12 bg-white py-8 md:py-14 md:pr-8 relative border-solid md:border-r-[0.05rem] border-mid-warm-grey"
			>
				<div class="h-fit sticky top-0">
				<div class="flex justify-between">
					<h1 class="text-2xl leading-2xl md:text-3xl md:leading-3xl mb-0">Analysis</h1>
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
												class="gap-4"
												name="renewables"
												label="Renewables"
												changeHandler={fuelTechChange}
												checked={technologySelections['renewables']}
											/>
											<ul class="ml-8">
												{#each getKeys(technologyFilters).filter((t) => technologyFilters[t].renewable) as technology}
													<li>
														<Checkbox
															class="gap-4"
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
												class="gap-4"
												name="non-renewables"
												label="Non-renewables"
												changeHandler={fuelTechChange}
												checked={technologySelections['non-renewables']}
											/>
											<ul class="ml-8">
												{#each getKeys(technologyFilters).filter((t) => !technologyFilters[t].renewable) as technology}
													<li>
														<Checkbox
															class="gap-4"
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
													class="gap-4"
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
								title="Date"
								isOpen={showDate}
								toggleHandler={() => (showDate = !showDate)}
								hasFilters={dateChosen !== 'none'}
								clearHandler={() => {
									dateChosen = 'none';
									setQueryString();
									// fetchArticles();
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
												: ''}
											changeHandler={(e) => {
												dateChosen = e.currentTarget.value;
												setQueryString();
											}}
										/>
									</div>
									<!-- {#if dateChosen !== 'none'}
										<div class="py-8 grid gap-4 grid-cols-2">
											<Button
												secondary={true}
												clickHandler={() => {
													dateChosen = dateSelection;
													setQueryString();
													fetchArticles();
												}}>Cancel</Button
											>
											<Button
												clickHandler={(e) => {
													dateSelection = dateChosen;
													dateChosen = 'none';

													setQueryString();
													fetchArticles();
												}}>Apply</Button
											>
										</div>
									{/if} -->
								</FilterContent>
							{/if}
						</FilterSection>
					</div>
				</div>
			</div>
			</div>
			<div class="md:w-9/12 grid grid-cols-1 md:grid-cols-3 py-12 gap-8">
				{#each filteredArticles as article}
					<ArticleCard class="max-h-[400px] min-h-[350px]" {article} />
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- <div class="container max-w-none lg:container py-12">
	<h1>Analysis</h1>
	<div class="grid grid-cols-3 py-12">
		{#each articles as { title, slug }}
			<div>
				<h3>{title}</h3>
				<a href="/analysis/{slug.current}">Read more</a>
			</div>
		{/each}
	</div>
</div> -->

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
