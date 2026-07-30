<script>
	import { page } from '$app/state';
	import Meta from '$lib/components/Meta.svelte';
	import SectionLink from '$lib/components/SectionLink.svelte';
	import Bands from './Bands.svelte';

	let status = $derived(page.status);
	let isNotFound = $derived(status === 404);
	let title = $derived(isNotFound ? 'Page not found' : 'Something went wrong');
</script>

<Meta {title} canonical={false} />

<section class="min-h-[60vh] flex items-center justify-center py-24 bg-white">
	<div class="container max-w-none lg:container">
		<div class="flex flex-col items-center text-center">
			{#if isNotFound}
				<Bands />
			{:else}
				<div class="subhead-secondary">Error {status}</div>
			{/if}

			<h1
				class="{isNotFound ? 'mt-12' : 'mt-4'} mb-0 text-2xl leading-2xl md:text-3xl md:leading-3xl"
			>
				{title}
			</h1>

			{#if !isNotFound}
				{#if page.error?.message}
					<p class="mt-6 mb-0 font-mono text-sm text-mid-grey max-w-2xl">{page.error.message}</p>
				{/if}
				<p class="mt-6 mb-0 text-base text-mid-grey max-w-2xl">
					Try refreshing, or head back to the homepage.
				</p>
				<div class="mt-12">
					<SectionLink href="/" title="Back to the homepage" />
				</div>
			{/if}
		</div>
	</div>
</section>
