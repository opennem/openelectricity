<script>
	import { page } from '$app/stores';

	const navItems = [
		{ name: 'Data Tracker', href: 'https://data.openelectricity.org.au/' },
		{ name: 'Facilities Map', href: 'https://data.openelectricity.org.au/facilities' },
		{ name: 'Path to 2050', href: '/isp' },
		{ name: 'Latest Records', href: '/records' },
		{ name: 'Analysis', href: '/analysis' },
		{ name: 'About', href: '/content/about' }
	];
</script>

<header class="h-28 border-mid-grey border-b-[0.05rem] border-solid">
	<div class="flex items-center justify-between container mx-auto h-full">
		<a href="/">
			<h1 class="m-0"><img class="block" src="/img/logo.svg" alt="Open Electricity" /></h1>
		</a>
		<nav class="px-4 py-2 flex justify-between gap-16">
			{#each navItems as { name, href }}
				<a
					class="text-sm font-medium flex items-center"
					class:active={$page.url.pathname === href}
					{href}>{name}</a
				>
			{/each}
		</nav>
	</div>
</header>

<style lang="postcss">
	nav a:after {
		content: '';
		display: block;
		width: 0.8rem;
		height: 0.8rem;
		border: 0.1rem solid theme(colors.black);
		margin-left: 1rem;
		opacity: 0;
	}
	nav a:hover:after {
		opacity: 1;
	}
	nav a.active:after {
		border-color: theme(colors.red);
		background-color: theme(colors.red);
		opacity: 1;
	}
</style>
