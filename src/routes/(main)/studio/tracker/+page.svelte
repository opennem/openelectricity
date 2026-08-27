<script>
	import { resolve } from '$app/paths';
	import { ArrowUpRight, ChartNoAxesCombined, Compass, Map } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';

	/** @type {Array<{href:'/studio/tracker/map'|'/studio/tracker/dashboard'|'/studio/tracker/explore',name:string,label:string,description:string,icon:any}>} */
	const reviews = [
		{
			href: '/studio/tracker/map',
			name: 'Map tracker',
			label: 'Map-first',
			description:
				'Explore the live grid through regional map charts, interconnector flows and a focused analysis panel.',
			icon: Map
		},
		{
			href: '/studio/tracker/dashboard',
			name: 'Dashboard tracker',
			label: 'Analysis-first',
			description:
				'Compare system metrics and charts in a configurable workspace with saved views and shareable layouts.',
			icon: ChartNoAxesCombined
		},
		{
			href: '/studio/tracker/explore',
			name: 'Explore',
			label: 'Explore-first',
			description:
				'Build a session-based canvas of charts and range-aware metrics from curated electricity queries.',
			icon: Compass
		}
	];
</script>

<Meta
	title="Tracker design review"
	description="Compare the map-first and dashboard tracker concepts."
	canonical={false}
/>
<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

<PageHeaderSimple>
	{#snippet heading()}
		<div class="flex flex-col items-center gap-4">
			<p class="m-0 font-space text-xs font-medium uppercase tracking-widest text-red">
				Design review
			</p>
			<h1 class="m-0 text-center">Tracker concepts</h1>
		</div>
	{/snippet}
	{#snippet subheading()}
		<p class="mx-auto mb-0 max-w-[720px] text-center text-sm text-mid-grey">
			Three approaches to exploring Australia’s electricity system — the design reviews that
			informed the <a href="/tracker">Tracker</a>. Open a concept below to review its information
			architecture, controls and responsive behaviour.
		</p>
	{/snippet}
</PageHeaderSimple>

<main class="container py-12 md:py-20">
	<div class="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
		{#each reviews as review (review.href)}
			{@const Icon = review.icon}
			<a
				href={resolve(review.href)}
				class="group flex min-h-[260px] flex-col rounded-xl border border-mid-warm-grey bg-white p-8 text-dark-grey no-underline transition-colors hover:border-dark-grey hover:no-underline md:p-10"
			>
				<div class="flex items-start justify-between gap-6">
					<div class="rounded-full bg-light-warm-grey p-4 text-dark-grey">
						<Icon class="size-7" strokeWidth={1.5} />
					</div>
					<ArrowUpRight
						class="size-6 text-mid-grey transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-red"
					/>
				</div>
				<div class="mt-auto pt-12">
					<p class="mb-2 font-space text-xxs font-medium uppercase tracking-wider text-red">
						{review.label}
					</p>
					<h2 class="mb-3 text-xl leading-xl">{review.name}</h2>
					<p class="m-0 max-w-md text-sm leading-relaxed text-mid-grey">{review.description}</p>
				</div>
			</a>
		{/each}
	</div>
</main>
