<script>
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';

	const prototypes = [
		{
			title: 'Lens',
			description:
				'An explicit Grid | Facilities toggle over one persistent map, a customisable chart dock, and named saved views (localStorage).',
			link: '/studio/tracker-map/modes'
		},
		{
			title: 'Focus stack',
			description:
				'Selection-driven drill-down NEM → region → facility with a breadcrumb spine — the dashboard is always about one focus object.',
			link: '/studio/tracker-map/focus'
		},
		{
			title: 'Continuum',
			description:
				'Zoom-semantic: the camera is the mode switch — grid fades to facilities as you zoom. Desktop only.',
			link: '/studio/tracker-map/continuum'
		},
		{
			title: 'Shell spike',
			description:
				'Architecture proof: one persistent MapLibre instance across sibling route navigations (portal vs mounted-scenes modes, with diagnostics).',
			link: '/studio/tracker-map/shell'
		}
	];

	const protocol = [
		{
			name: 'Cold read',
			description:
				'Within 10 seconds of landing, name the biggest interconnector flow and the most expensive region.'
		},
		{
			name: 'The Loy Yang sprint',
			description:
				"From the national view, reach Loy Yang A's facility detail in as few gestures as possible; count them."
		},
		{
			name: 'Negative-price trace',
			description:
				'"SA price is negative: why?" Get from the price signal to SA\'s curtailment/solar picture; note whether the standalone curtailment chart or the region supply-balance stack answers it faster.'
		},
		{
			name: 'Custom view (Lens only)',
			description:
				'Build a 3-chart view (SA price, SA curtailment, an interconnector flow), save it as "SA solar watch", reload the page, confirm it restores with filters.'
		},
		{
			name: 'Return trip',
			description:
				'From a facility detail, get back to the national flows view; does camera/filters/time-range survive, and does it feel like returning or restarting?'
		},
		{
			name: 'Mid-state probe (Continuum)',
			description:
				'Stop at an ambiguous zoom; can you say what you are looking at and what a click will do?'
		},
		{
			name: 'Mobile smoke',
			description: 'Narrow viewport; Lens must be usable, the others just must not break.'
		}
	];
</script>

<Meta
	title="Tracker map explorations"
	description="Three competing prototypes for the unified tracker + facilities map app, each testing a different transition model."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	{#snippet heading()}
		<div>
			<h1 class="tracking-widest text-center">Tracker map — design exploration</h1>
		</div>
	{/snippet}
	{#snippet subheading()}
		<div>
			<p class="text-sm text-center w-full md:w-[800px] mx-auto">
				Three competing prototypes for the unified tracker + facilities map app. The map is the
				common layer; each prototype tests a different transition model between the grid view and
				the facilities view. All three share live flows and prices, and the same chart stack.
			</p>
		</div>
	{/snippet}
</PageHeaderSimple>

<section class="md:container py-12">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
		{#each prototypes as prototype (prototype.title)}
			<div
				class="bg-dark-grey p-8 rounded-xl grid grid-cols-1 gap-8 content-between text-light-warm-grey relative"
			>
				<div>
					<h2 class="text-lg font-light font-space leading-lg">
						{prototype.title}
					</h2>
				</div>
				<div>
					<p class="text-xs">{prototype.description}</p>
					<a href={prototype.link} class="font-semibold text-sm text-error-red">View Prototype</a>
				</div>
			</div>
		{/each}
	</div>
</section>

<section class="md:container pb-12">
	<div class="px-6 w-full md:w-[800px] md:mx-auto">
		<h2 class="text-lg font-space">Comparison protocol</h2>
		<p class="text-sm mt-2">Judge each prototype against the same ordered set of tasks:</p>
		<ol class="list-decimal list-outside pl-6 mt-6 flex flex-col gap-4">
			{#each protocol as task (task.name)}
				<li class="text-sm">
					<span class="font-semibold">{task.name}</span> — {task.description}
				</li>
			{/each}
		</ol>
		<p class="text-sm mt-8">
			<span class="font-semibold">Judging axes:</span> orientation · gesture economy · transition legibility
			(continuous vs shared-canvas) · dashboard utility · gimmick-risk.
		</p>
	</div>
</section>
