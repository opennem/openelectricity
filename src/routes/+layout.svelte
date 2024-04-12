<script>
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	import { onNavigate } from '$app/navigation';

	onNavigate((navigation) => {
		// If the browser doesn't support view transitions, return early
		// @ts-ignore
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			// @ts-ignore
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<div class="w-full h-[40px] bg-black text-white text-center text-sm p-4 font-light">
	<strong class="font-semibold">OpenNEM</strong> is now
	<strong class="font-semibold">Open Electricity</strong>.
	<a
		href="https://openelectricity.org.au/analysis/from-opennem-to-open-electricity"
		class="underline text-white"
	>
		Read
	</a> about the update.
</div>

<Nav />

<main class="flex-grow">
	<slot />
</main>

<Footer />
