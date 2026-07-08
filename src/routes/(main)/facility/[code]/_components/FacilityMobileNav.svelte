<script>
	import { ChartArea, Layers, MapPin, Info } from '@lucide/svelte';

	/**
	 * Slim, app-style bottom navigation for the facility detail page on mobile.
	 * Switches which section renders below the (always-visible) hero header, so
	 * users tap between Charts / Units / Map / About instead of scrolling the page.
	 *
	 * `tablet:hidden` — desktop keeps the resizable two-column layout and never shows
	 * this bar. The active section is toggled by the page via `max-tablet:hidden`, so
	 * this component only reflects and reports the selection.
	 *
	 * `height` is bound so the page can size the full-bleed Map tab to the space
	 * between the header and this bar.
	 *
	 * @type {{
	 *   active: 'charts' | 'units' | 'map' | 'about',
	 *   onselect: (tab: 'charts' | 'units' | 'map' | 'about') => void,
	 *   hasMap?: boolean,
	 *   height?: number
	 * }}
	 */
	let { active, onselect, hasMap = false, height = $bindable(0) } = $props();

	/** @type {Array<{ value: 'charts' | 'units' | 'map' | 'about', label: string, icon: any }>} */
	const allTabs = [
		{ value: 'charts', label: 'Charts', icon: ChartArea },
		{ value: 'units', label: 'Units', icon: Layers },
		{ value: 'map', label: 'Map', icon: MapPin },
		{ value: 'about', label: 'About', icon: Info }
	];

	// Drop the Map tab for facilities without a location.
	let tabs = $derived(hasMap ? allTabs : allTabs.filter((t) => t.value !== 'map'));
</script>

<nav
	bind:clientHeight={height}
	class="fixed inset-x-0 bottom-0 z-30 flex border-t border-mid-warm-grey/40 bg-white tablet:hidden"
	style="padding-bottom: env(safe-area-inset-bottom);"
	aria-label="Facility sections"
>
	{#each tabs as tab (tab.value)}
		{@const isActive = active === tab.value}
		{@const Icon = tab.icon}
		<button
			type="button"
			onclick={() => onselect(tab.value)}
			aria-current={isActive ? 'page' : undefined}
			class={[
				'relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red',
				isActive ? 'text-red' : 'text-mid-grey hover:text-dark-grey'
			]}
		>
			{#if isActive}
				<span class="absolute inset-x-0 top-0 h-0.5 bg-red" aria-hidden="true"></span>
			{/if}
			<Icon size={20} strokeWidth={1.75} />
			<span class="text-[10px] font-medium leading-none">{tab.label}</span>
		</button>
	{/each}
</nav>
