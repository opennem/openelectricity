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

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let showMenu = false;

	// Grab defaults from URL if present
	let pURL = null;
	let technologyArgs = null;

	let regionArgs = null;

	let showTechnology = false;
	let showRegions = false;
	let showDate = false;
	let searchString = $state('');

	/** @type {*} */
	let technologySelections = $state(null);
	/** @type {*} */
	let regionSelections = $state(null);
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

	let hasSearchTerm = $derived(searchString.trim() !== '');
	let hasTechnologySelections = $derived(
		technologySelections
			? Object.values(technologySelections).find((selection) => selection)
			: false
	);
	let hasRegionSelections = $derived(
		regionSelections ? Object.values(regionSelections).find((selection) => selection) : false
	);
	let hasFilters = $derived(hasSearchTerm || hasTechnologySelections || hasRegionSelections);

	let articlesFilter = $derived((/** @type {Article[]} */ articles) =>
		articles?.filter((article) => {
			const searchFilter =
				article.title.toLowerCase().includes(searchString.toLowerCase()) ||
				article.author.some((author) =>
					author.name.toLocaleLowerCase().includes(searchString.toLocaleLowerCase())
				) ||
				searchString.trim() === '';
			const technologyFilter = technologySelections
				? technologySelections[article.fueltech] || !hasTechnologySelections
				: false;
			const regionFilter = regionSelections
				? regionSelections[article.region] || !hasRegionSelections
				: false;
			const dateFilter = article.publish_date === dateChosen || dateChosen === 'none';

			return searchFilter && technologyFilter && regionFilter && dateFilter;
		})
	);

	let filteredArticles = $derived(articlesFilter(data.articles) || []);

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

<Meta title="Analysis" image="/img/preview.jpg" />

<div>
	<div class="container max-w-none lg:container">
		<div class="block md:flex gap-8">
			<div
				class="records-sidebar-fill records-sidebar min-w-[27rem] w-full md:w-3/12 bg-white py-8 md:py-14 md:pr-8 relative border-solid md:border-r-[0.05rem] border-mid-warm-grey"
			>
				<div class="h-fit sticky top-0">
					<div class="flex justify-between">
						<h1 class="text-2xl leading-2xl md:text-3xl md:leading-3xl mb-0">Analysis</h1>
						<!-- <Button
						secondary={true}
						class="text-black flex-shrink-0 w-16 h-16 flex justify-center align-middle md:hidden"
						active={showMenu}
						clickHandler={() => {
							showMenu = !showMenu;
						}}><Icon icon="filter" /></Button
					> -->
					</div>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 py-12 gap-8">
				{#each filteredArticles as article}
					<ArticleCard class="min-h-[350px]" {article} preview={true} />
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
