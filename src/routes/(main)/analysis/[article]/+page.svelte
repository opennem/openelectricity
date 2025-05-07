<script>
	import { format } from 'date-fns';
	import { urlFor } from '$lib/sanity';
	import RichText from '$lib/components/text-components/RichText.svelte';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import Meta from '$lib/components/Meta.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	// $: console.log('analysis', data);

	let hasCover = $derived(data.cover);
	let formattedDate = $derived(format(new Date(data.publishDate), 'do MMM, yyyy'));
</script>

<Meta
	title={data.title}
	type="article"
	description={data.summary}
	image={hasCover ? urlFor(data.cover).height(630).url() : '/img/preview.jpg'}
/>

<div class="relative">
	<div class="bg-light-warm-grey absolute w-full h-[500px] md:h-[750px] z-1"></div>

	<div class="container max-w-none lg:container py-12 relative z-10">
		<div class="pb-10 md:py-14">
			<a
				href="/analysis"
				class="inline-flex gap-4 items-center text-dark-grey hover:text-dark-red underline font-space font-medium text-sm"
			>
				<IconChevronLeft class="w-8 h-8" />
				Back to Analysis
			</a>
		</div>

		<header>
			<h1 class="md:mb-20 text-3xl leading-3xl md:text-9xl md:leading-9xl md:mr-20">
				{data.title}
			</h1>

			<div class="grid grid-cols-1 md:grid-cols-4 place-items-start">
				<div class="flex items-center gap-6 order-2 md:order-1">
					<div class="flex items-center">
						{#each data.author as author, i}
							<span class={`w-20 h-20 block grayscale relative ${i > 0 ? '-left-3' : 'left-0'}`}>
								{#if author.image}
									<img
										class="rounded-full border border-white"
										src={urlFor(author.image).width(100).height(100).url()}
										alt={author.image.alt}
									/>
								{:else}
									<img
										class="rounded-full border border-white p-2"
										src="/favicon.png"
										alt="author"
									/>
								{/if}
							</span>
						{/each}
					</div>
					<div class="text-sm mt-1">
						<div class="author flex flex-wrap justify-start gap-1 text-dark-grey">
							{#each data.author as author, i}
								{#if i > 0}
									<span>+</span>
								{/if}
								<span>{author.name}</span>
							{/each}
						</div>

						<span class="text-mid-grey font-light">{formattedDate}</span>
					</div>
				</div>

				<p class="col-span-2 text-dark-grey text-lg leading-xl order-1 md:order-2">
					{data.summary}
				</p>
			</div>
		</header>
	</div>
</div>

{#if hasCover}
	<div class="max-w-none lg:container pb-12 md:py-4 relative">
		<figure>
			<img class="mx-auto block" src={urlFor(data.cover).height(1390).url()} alt={data.cover.alt} />
			{#if data.cover.alt}
				<figcaption>{data.cover.alt}</figcaption>
			{/if}
		</figure>
	</div>
{/if}

<div class="container max-w-none lg:container">
	{#if data.content}
		<div class="md:mt-24">
			<RichText content={data.content} />
		</div>
	{/if}
</div>

<div class="container max-w-none lg:container pt-12 pb-36">
	<div class="flex items-start gap-6 max-w-5xl mx-auto border-y border-mid-warm-grey py-12">
		<div class="flex items-center">
			{#each data.author as author, i}
				<span class={`w-20 h-20 block grayscale relative ${i > 0 ? '-left-3' : 'left-0'}`}>
					<img
						class="rounded-full border border-white"
						src={urlFor(author.image).width(100).height(100).url()}
						alt={author.image.alt}
					/>
				</span>
			{/each}
		</div>
		<div class="text-sm mt-2">
			<div class="author flex flex-wrap justify-start gap-1 text-dark-grey">
				{#each data.author as author, i}
					{#if i > 0}
						<span>+</span>
					{/if}
					<span>{author.name}</span>
				{/each}
			</div>

			<div class="author flex flex-wrap justify-start gap-1 text-mid-grey font-light">
				{#each data.author as author}
					<span>{author.position}</span>
				{/each}
			</div>

			<div class="author-bio text-mid-grey mt-4">
				{#each data.author as author}
					<span>{author.bio}</span>
				{/each}
			</div>
		</div>
	</div>
</div>
