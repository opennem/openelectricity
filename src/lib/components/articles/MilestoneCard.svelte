<script>
	import { format, parse } from 'date-fns';
	import { urlFor } from '$lib/sanity';
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {Article} article
	 */

	/** @type {Props & { [key: string]: any }} */
	let { article, preview = false, ...rest } = $props();

	const publishedDate = parse(article.publish_date, 'yyyy-MM-dd', new Date());
</script>

<a
	href={`${preview ? '/article-drafts' : '/analysis'}/${article.slug.current}`}
	class={`grid grid-cols-1 content-between overflow-hidden border border-warm-grey rounded-lg text-dark-grey hover:no-underline ${rest.class}`}
>
	<header class="mt-8">
		<div class="flex items-center justify-between px-8">
			<FuelTechTag fueltech={article.fueltech}>Milestone</FuelTechTag>
			<span class="text-xs">{format(publishedDate, 'dd MMM yyyy')}</span>
		</div>

		<h3 class="font-medium px-8 mt-8">{article.title}</h3>
	</header>

	{#if article.cover}
		<img
			class="rounded-b-lg"
			src={urlFor(article.cover).width(1020).height(574).url()}
			alt={article.cover.alt}
		/>
	{:else}
		<div
			style={`background-image: url(/img/records/${article.fueltech}.png)`}
			class="h-[172px] bg-no-repeat bg-top bg-cover rounded-b-lg"
		></div>
	{/if}
</a>

<style>
	a:hover h3 {
		text-decoration: underline;
	}
	h3 {
		font-size: 2rem;
		line-height: 2.4rem;
	}
</style>
