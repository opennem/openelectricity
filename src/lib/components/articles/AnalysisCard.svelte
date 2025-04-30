<script>
	import { format, parse } from 'date-fns';
	import { urlFor } from '$lib/sanity';

	/**
	 * @typedef {Object} Props
	 * @property {Article} article
	 */

	/** @type {Props & { [key: string]: any }} */
	let { article, preview = false, ...rest } = $props();

	// $: console.log('isSpecialCard', isSpecialCard, article.title);

	const publishedDate = parse(article.publish_date, 'yyyy-MM-dd', new Date());
	// $: console.log('article', article);

	let hasCover = $derived(article.cover);
	let isSpecialCard = $derived(
		article.title === 'Seeing into the Future of Australia’s Electricity Market'
	);
	let linkStyles = $derived(
		hasCover && !isSpecialCard
			? `h-full grid grid-cols-1 gap-4 content-between overflow-hidden border-y border-warm-grey text-dark-grey hover:no-underline ${rest.class}`
			: `h-full bg-light-warm-grey grid grid-cols-1 gap-4 content-between overflow-hidden border border-warm-grey rounded-lg text-dark-grey hover:no-underline ${rest.class}`
	);
	let headerStyles = $derived(hasCover && !isSpecialCard ? 'my-8 h-42' : 'my-8 px-6 h-42');
	let authorStyles = $derived(
		hasCover && !isSpecialCard
			? 'flex items-center gap-8 justify-between mt-6'
			: 'flex items-center gap-8 justify-between px-6 my-6'
	);
	let tag = $derived(article.tags && article.tags.length ? article.tags[0] : null);
</script>

<a href={`${preview ? '/article-drafts' : '/analysis'}/${article.slug.current}`} class={linkStyles}>
	<header class={headerStyles}>
		<div class="text-xs flex items-center justify-between">
			{#if tag}
				<span class="px-2 rounded-full bg-warm-grey text-dark-grey">{tag.title}</span>
			{/if}
			<span>{format(publishedDate, 'dd MMM yyyy')}</span>
		</div>

		<h3 class="font-medium mt-8 line-clamp-4">
			{article.title}
		</h3>

		{#if !hasCover || isSpecialCard}
			<p class="text-mid-grey text-sm">{article.summary}</p>
		{/if}
	</header>

	<div class="grid grid-cols-1 gap-4">
		<div class={authorStyles}>
			<div class="flex items-center">
				{#each article.author as author, i}
					<span class={`w-16 h-16 block grayscale relative ${i > 0 ? '-left-2' : 'left-0'}`}>
						<img
							class="rounded-full border border-white"
							src={urlFor(author.image).width(100).height(100).url()}
							alt={author.image.alt}
						/>
					</span>
				{/each}
			</div>

			<div class="author flex flex-wrap justify-end gap-1 text-xs text-mid-grey">
				{#each article.author as author, i}
					{#if i > 0}
						<span>+</span>
					{/if}
					<span>{author.name}</span>
				{/each}
			</div>
		</div>
		{#if hasCover && !isSpecialCard}
			<img src={urlFor(article.cover).width(590).height(346).url()} alt={article.cover.alt} />
		{/if}
	</div>
</a>

<style>
	a:hover h3 {
		text-decoration: underline;
	}
	h3 {
		font-size: 2rem;
		line-height: 2.4rem;
	}
	.author {
		line-height: 1.2rem;
	}
</style>
