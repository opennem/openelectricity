<script>
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import StratifyHeader from '../_components/StratifyHeader.svelte';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	const links = [
		{ href: '/stratify/docs', label: 'Chart examples' },
		{ href: '/stratify/docs/guides', label: 'Guides' }
	];
</script>

<div class="min-h-dvh bg-white text-dark-grey">
	<StratifyHeader sticky />
	<nav
		class="sticky top-22 z-30 border-b border-warm-grey bg-white/95 backdrop-blur-sm"
		aria-label="Documentation"
	>
		<div class="container flex items-center gap-2 overflow-x-auto py-3">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="whitespace-nowrap rounded-full px-5 py-2 font-space text-xxs font-medium uppercase tracking-wider hover:no-underline {page
						.url.pathname === link.href ||
					(page.url.pathname.startsWith(`${link.href}/`) && link.href !== '/stratify/docs') ||
					(page.url.pathname.startsWith('/stratify/docs/examples/') &&
						link.href === '/stratify/docs')
						? 'bg-dark-grey text-white'
						: 'text-mid-grey hover:bg-warm-grey hover:text-dark-grey'}"
				>
					{link.label}
				</a>
			{/each}
			<Button href="/stratify/new" class="ml-auto whitespace-nowrap">Create a chart</Button>
		</div>
	</nav>

	{@render children()}
</div>
