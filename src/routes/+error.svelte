<script>
	// Unmatched URLs belong to no route group, so this boundary renders inside
	// the bare root layout — Nav and Footer are imported directly (both are
	// self-contained) to keep the full site chrome. Errors thrown inside
	// (main)/(micro) routes are caught by those groups' own +error.svelte.
	import GlobalBanner from '$lib/components/GlobalBanner.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ErrorContent from '$lib/components/error-page/ErrorContent.svelte';
</script>

<div class="min-h-screen flex flex-col">
	<GlobalBanner />
	<Nav />
	<main class="grow">
		<ErrorContent />
	</main>
	<Footer />
</div>
