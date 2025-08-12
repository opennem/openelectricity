<script>
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import { Button } from '$lib/components/ui/button';

	let title = $state('Button Demo');
</script>

<Meta {title} description="Demo of Button variants and sizes" image="/img/preview.jpg" />

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">{title}</h1>
	</div>
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[800px] mx-auto">
			Explore different Button variants and sizes.
		</p>
	</div>
</PageHeaderSimple>

<section class="md:container py-8 text-base space-y-10">
	<div>
		<h2 class="text-xl font-semibold mb-3">Variants</h2>
		<div class="flex flex-wrap gap-3">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="link" href="#">Link</Button>
		</div>
	</div>

	<div>
		<h2 class="text-xl font-semibold mb-3">Sizes</h2>
		<div class="flex flex-wrap items-center gap-3">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon" aria-label="Icon button">🔍</Button>
		</div>
	</div>
</section>
