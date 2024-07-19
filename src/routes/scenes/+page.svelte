<script>
	import { setContext, getContext } from 'svelte';

	import { colourReducer } from '$lib/stores/theme';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import DataViz from './components/DataViz.svelte';
	import filtersStore from './stores/filters';
	import dataVizStore from './stores/data-viz';
	import { fetchTechnologyViewData } from './page-data-options/fetch';
	import { processTechnologyData } from './page-data-options/process';

	export let data;
	const { articles, filters } = data;

	setContext('scenario-filters', filtersStore());
	setContext('scenario-data-viz', dataVizStore());

	const {
		isTechnologyViewSection,
		selectedRegion,
		selectedDataType,
		singleSelectionData,
		selectedFuelTechGroup,
		multiSelectionData
	} = getContext('scenario-filters');
	const { seriesData, seriesNames, seriesColours, seriesLabels, nameOptions, yDomain } =
		getContext('scenario-data-viz');

	$: console.log(articles, filters);

	$: if ($isTechnologyViewSection) {
		fetchTechnologyViewData({
			model: $singleSelectionData.model,
			scenario: $singleSelectionData.scenario,
			pathway: $singleSelectionData.pathway,
			region: $selectedRegion,
			dataType: $selectedDataType
		}).then(({ projection, history }) => {
			console.log('projection', projection);
			console.log('history', history);
			const processed = processTechnologyData({
				projection,
				history,
				group: $selectedFuelTechGroup,
				dataType: $selectedDataType,
				colourReducer: $colourReducer
			});

			if (processed) {
				updateDataVizStore(processed);
			}
		});
	}

	/**
	 * @param {{
	 * seriesData: TimeSeriesData[],
	 * seriesNames: string[],
	 * seriesColours: Object.<string, string>,
	 * seriesLabels: Object.<string, string>,
	 * nameOptions: { label: string, value: string }[],
	 * yDomain: number[]
	 * }} p
	 */
	function updateDataVizStore(p) {
		$seriesData = p.seriesData;
		$seriesNames = p.seriesNames;
		$seriesColours = p.seriesColours;
		$seriesLabels = p.seriesLabels;
		$nameOptions = p.nameOptions;
		$yDomain = p.yDomain;
	}
</script>

<Filters />

<DataViz />

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
