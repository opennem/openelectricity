<script>
	import Meta from '$lib/components/Meta.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	import IconPypi from '$lib/icons/Pypi.svelte';
	import IconGithub from '$lib/icons/Github.svelte';
	import IconGlobeAlt from '$lib/icons/GlobeAlt.svelte';
	import IconDocumentText from '$lib/icons/DocumentText.svelte';
	import IconTwitter from '$lib/icons/TwitterX.svelte';

	import Resource from './Resource.svelte';
</script>

<Meta title="Developer" />
<PageHeader title="Developer" />

<main class="max-w-5xl mx-auto py-24 px-10 md:px-0 text-base">
	<h2>Resources</h2>

	<section class="py-12">
		<dl
			class="flex flex-col gap-8 mt-8 divide-y md:divide-y-0 divide-dotted divide-mid-warm-grey border-y md:border-y-0 border-dotted border-mid-warm-grey"
		>
			<Resource>
				{#snippet icon()}
					<IconDocumentText class="w-12 h-12" />
				{/snippet}
				<h5>Developer Documentation</h5>
				<a href="https://developers.opennem.org.au">https://developers.opennem.org.au</a>
			</Resource>

			<Resource>
				{#snippet icon()}
					<IconGlobeAlt class="w-12 h-12" />
				{/snippet}
				<h5>OpenAPI</h5>
				<a href="https://api.opennem.org.au/docs">https://api.opennem.org.au/docs</a>
			</Resource>

			<Resource>
				{#snippet icon()}
					<IconGithub class="w-12 h-12" />
				{/snippet}
				<h5>GitHub</h5>
				<a href="https://github.com/opennem">https://github.com/opennem</a>
			</Resource>

			<Resource>
				{#snippet icon()}
					<IconPypi class="w-14 h-14" />
				{/snippet}
				<h5>Python Package Index</h5>
				<a href="https://pypi.org/project/opennem">https://pypi.org/project/opennem</a>
			</Resource>

			<Resource>
				{#snippet icon()}
					<IconTwitter class="w-12 h-12" />
				{/snippet}
				<h5>Social Media</h5>
				<a href="https://twitter.com/opennem">https://twitter.com/opennem</a>
			</Resource>
		</dl>
	</section>
</main>
