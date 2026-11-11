<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { isNonProductionHost } from '#lib/utils/environment.js';
	import { trackBackNavigation } from '#lib/utils/back-navigation.js';

	let { children } = $props();

	trackBackNavigation();

	// Flag the document once the app has hydrated, so e2e tests can wait for
	// event handlers to be attached before they interact with the page.
	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});

	const DEV_TITLE_PREFIX = '[DEV] ';

	$effect(() => {
		if (!isNonProductionHost(page.url.hostname)) return;

		const apply = () => {
			if (!document.title.startsWith(DEV_TITLE_PREFIX)) {
				document.title = DEV_TITLE_PREFIX + document.title;
			}
		};
		apply();

		// Observe document.head rather than the <title> element directly: SvelteKit
		// may replace the title element on navigation, and reactive expressions
		// inside <svelte:head><title> update its text node — both surface here.
		const observer = new MutationObserver(apply);
		observer.observe(document.head, { childList: true, subtree: true, characterData: true });
		return () => observer.disconnect();
	});
</script>

{@render children?.()}
