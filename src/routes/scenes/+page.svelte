<script>
	import { setContext, getContext } from 'svelte';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';

	import filtersStore from './stores/filters';

	export let data;
	const { articles, filters } = data;

	setContext('scenario-filters', filtersStore());

	$: console.log(articles, filters);
</script>

<h1>scenes</h1>

<Filters />

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
