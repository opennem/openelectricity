<script>
	import { urlFor } from '$lib/sanity';

	/** @type {import('$lib/types/article.types').Article} */
	export let article;
</script>

<a
	href={`/analysis/${article.slug.current}`}
	class={`flex flex-col h-full py-8 ${$$restProps.class}`}
>
	<h3>{article.title}</h3>
	{#if article.cover}
		<img src={urlFor(article.cover).width(590).height(346).url()} alt={article.cover.alt} />
	{/if}
	<div
		style={`background-image: url(/img/records/${article.fueltech}.png)`}
		class={`h-44 bg-no-repeat bg-top bg-cover`}
	/>
</a>
