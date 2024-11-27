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
			The Studio is a space dedicated to the experimental exploration of data visualisation. It
			serves as a sandbox for developing innovative projects that push the boundaries of how data is
			understood and presented. While some of these projects may eventually be integrated into Open
			Electricity, others may evolve into standalone initiatives.
		</p>
		<p class="text-sm text-center w-full md:w-[800px] mx-auto">
			The primary goal is to experiment with new ways of visualising and interpreting data, with
			valuable insights and technical advancements feeding back into Open Electricity’s core
			features, improving both its functionality and user experience.
		</p>
	</div>
</PageHeaderSimple>
