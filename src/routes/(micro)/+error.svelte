<script>
	// Bare, compact error for the (micro) embed surfaces (strata-embed/[id],
	// record/[id], widget) — these render inside iframes, so no site chrome
	// and no links that would navigate the parent page.
	import { page } from '$app/state';
	import LogoMark from '$lib/images/logo-mark.svelte';

	let message = $derived(
		page.error?.message || (page.status === 404 ? 'Not found.' : 'Something went wrong.')
	);
</script>

<svelte:head>
	<title>{page.status} | Open Electricity</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-white">
	<LogoMark classes="w-14 h-8 fill-mid-warm-grey" animated={false} />
	<p class="m-0 font-mono text-sm text-mid-grey text-center">{page.status} · {message}</p>
</div>
