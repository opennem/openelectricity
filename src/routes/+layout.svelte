<script>
	import '../app.css';
	import { page } from '$app/state';
	import { isNonProductionHost } from '$lib/utils/environment.js';

	let { children } = $props();

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
