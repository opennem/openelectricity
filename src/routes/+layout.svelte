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

		const titleEl = document.querySelector('title');
		if (!titleEl) return;
		const observer = new MutationObserver(apply);
		observer.observe(titleEl, { childList: true });
		return () => observer.disconnect();
	});
</script>

{@render children?.()}
