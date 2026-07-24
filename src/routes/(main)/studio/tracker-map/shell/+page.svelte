<script>
	const links = [
		{ href: '/studio/tracker-map/shell/facilities', label: 'Facilities (portal mode)' },
		{ href: '/studio/tracker-map/shell/tracker', label: 'Tracker (portal mode)' },
		{
			href: '/studio/tracker-map/shell/facilities?scenes=mounted',
			label: 'Facilities (mounted scenes)'
		},
		{
			href: '/studio/tracker-map/shell/tracker?scenes=mounted',
			label: 'Tracker (mounted scenes)'
		}
	];
</script>

<div class="flex flex-col gap-6 p-6">
	<div>
		<h1 class="text-lg font-semibold">Unified map shell spike</h1>
		<p class="mt-2 text-sm leading-relaxed">
			This spike proves that a layout can own one persistent MapLibre map while sibling child routes
			swap the layers drawn on it and the panels beside it. Watch the diagnostics strip: map mounts
			and tile loads should stay flat while navigations climb.
		</p>
	</div>

	<ul class="flex flex-col gap-2 text-sm">
		{#each links as link (link.href)}
			<li><a class="text-blue-600 underline" href={link.href}>{link.label}</a></li>
		{/each}
	</ul>
</div>
