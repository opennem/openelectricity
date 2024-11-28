<script>
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';
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
			The Studio is a space dedicated to the experimental exploration of data projects. While some
			of these may eventually be integrated into Open Electricity, others may evolve into standalone
			initiatives.
		</p>
	</div>
</PageHeaderSimple>

<section class="md:container py-12">
	<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
		<div class="border border-mid-warm-grey p-8 rounded-xl">
			<h2 class="text-lg font-bold font-space">Records</h2>
			<p class="text-sm">
				Records tracks significant events in the history of the Australian electricity market.
			</p>
			<a href="/records" class="font-space">View Project</a>
		</div>

		<div class="border border-mid-warm-grey p-8 rounded-xl">
			<h2 class="text-lg font-bold font-space">Lens</h2>
			<p class="text-sm">
				Lens visualises energy and emissions data from regions around the world using Open
				Electricity's visualisation components.
			</p>
			<a href="/studio/lens" class="font-space">View Project</a>
		</div>
	</div>
</section>
