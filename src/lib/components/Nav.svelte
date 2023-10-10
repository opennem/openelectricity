<script>
	const navItems = [
		{ name: 'Home', href: '/' },
		{ name: 'Articles', href: '/analysis' },
		{ name: 'Facility', href: '/facility' },
		{ name: 'Page content', href: '/content' }
	];
</script>

<nav class="p-2 flex gap-6">
	{#each navItems as { name, href }}
		<a class="text-stone-500 underline" {href}>{name}</a>
	{/each}
</nav>
