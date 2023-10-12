<script>
	const navItems = [
		{ name: 'Home', href: '/' },
		{ name: 'Articles', href: '/analysis' },
		{ name: 'Facility', href: '/facility/BAYSW' },
		{ name: 'Page content', href: '/content' }
	];
</script>

<nav class="px-4 py-2 flex justify-end gap-6 bg-gray-400">
	{#each navItems as { name, href }}
		<a class="text-stone-200" {href}>{name}</a>
	{/each}
</nav>
