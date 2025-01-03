<script>
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';

	const projects = [
		{
			title: 'Records',
			description: 'Track significant events in the history of the Australian electricity market.',
			link: '/records',
			disabled: false
		},
		{
			title: 'Lens on Ember',
			description: 'Visualise energy and emissions data from regions around the world.',
			link: '/studio/lens-on-ember'
		},
		{
			title: 'Lens on Australia’s electricity system and market',
			description: 'Visualise energy, pricing and emissions data from Australia.',
			link: '/studio/lens-on-au',
			disabled: true
		},
		{
			title: 'Atlas on Australia’s power generation facilities',
			description: 'Explore power generation facilities from Australia.',
			link: '/studio/atlas-on-au-power-generation-facilities',
			disabled: true
		},
		{
			title: 'Lens on Australia’s emissions projections 2024',
			description:
				'Visualise the latest estimates of Australia’s greenhouse gas emissions to 2040.',
			link: '/studio/lens-on-au-emissions-projections',
			disabled: true
		},
		{
			title: 'Australia Live',
			description: 'Visualise the current status of Australia’s electricity grid.',
			link: '/studio/australia-live',
			disabled: false
		}
	];
</script>

<Meta
	title="The Studio"
	description="The Studio is a space dedicated to the experimental exploration of data visualisation."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">The Studio</h1>
	</div>
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[800px] mx-auto">
			The Studio is a space for the experimental exploration of data projects. While some of these
			may eventually be integrated into Open Electricity, others may evolve into standalone
			initiatives.
		</p>
	</div>
</PageHeaderSimple>

<section class="md:container py-12">
	<div class="grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
		{#each projects as project}
			<div
				class="bg-dark-grey p-8 rounded-xl grid grid-cols-1 gap-8 content-between text-light-warm-grey"
			>
				<div>
					<h2 class="text-lg font-light font-space leading-lg">
						{project.title}
					</h2>
				</div>
				<div>
					<p class="text-xs">{project.description}</p>
					{#if project.disabled}
						<span class="text-sm text-dark-red">Coming soon</span>
					{:else}
						<a href={project.link} class="font-semibold text-sm text-error-red">View Project</a>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</section>
