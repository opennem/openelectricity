<script>
	import { page } from '$app/state';
	import LoginGate from '$lib/components/auth/LoginGate.svelte';
	import { isPublicStratifyRoute, stratifySignInRedirect } from '$lib/stratify/routes.js';
	import StratifyHeader from './_components/StratifyHeader.svelte';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	let isPublicDocumentation = $derived(isPublicStratifyRoute(page.url.pathname));
	let signInRedirect = $derived(stratifySignInRedirect(page.url));
</script>

{#if isPublicDocumentation}
	{@render children?.()}
{:else}
	<!-- Admin-only: draft charts, collaborators' names and emails. Masked in
	     Sentry session replays; display: contents leaves the layout alone. -->
	<div class="contents" data-sentry-mask>
		<LoginGate redirectUrl={signInRedirect} title="Sign in">
			{#snippet header()}
				<StratifyHeader />
			{/snippet}
			{@render children?.()}
		</LoginGate>
	</div>
{/if}
