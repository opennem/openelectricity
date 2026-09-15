<script>
	import ArticlePage from '$lib/components/articles/ArticlePage.svelte';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<ArticlePage {data} preview />
