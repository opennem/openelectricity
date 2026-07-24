<script>
	/**
	 * PrototypeSwitcherSection — an OptionsMenu `sections` block for hopping
	 * between the tracker-map prototypes. The current prototype is ticked; every
	 * href carries the windowed opt-out (`?fullscreen=false`) when the caller is
	 * windowed, so the chrome mode survives the hop. Ends with its own trailing
	 * divider per the OptionsMenu sections convention.
	 */

	import { Check } from '@lucide/svelte';
	import OptionsMenuItem from '$lib/components/ui/options-menu/OptionsMenuItem.svelte';
	import OptionsMenuDivider from '$lib/components/ui/options-menu/OptionsMenuDivider.svelte';
	import OptionsMenuHeading from '$lib/components/ui/options-menu/OptionsMenuHeading.svelte';
	import { windowedHref } from '$lib/utils/fullscreen-mode.js';

	/**
	 * @type {{
	 *   current: 'modes' | 'focus' | 'continuum',
	 *   windowed?: boolean,
	 *   close: () => void
	 * }}
	 */
	let { current, windowed = false, close } = $props();

	const PROTOTYPES = [
		{ id: 'modes', label: 'Lens — modes', href: '/studio/tracker-map/modes' },
		{ id: 'focus', label: 'Focus stack', href: '/studio/tracker-map/focus' },
		{ id: 'continuum', label: 'Continuum', href: '/studio/tracker-map/continuum' }
	];
</script>

<OptionsMenuHeading>Prototypes</OptionsMenuHeading>

{#each PROTOTYPES as prototype (prototype.id)}
	<OptionsMenuItem
		icon={prototype.id === current ? Check : undefined}
		href={windowedHref(prototype.href, windowed)}
		onclick={close}
	>
		{prototype.label}
	</OptionsMenuItem>
{/each}

<!-- The hub is a normal windowed studio page, so the param is a harmless no-op
     there — passed anyway for consistency. -->
<OptionsMenuItem href={windowedHref('/studio/tracker-map', windowed)} onclick={close}>
	All prototypes
</OptionsMenuItem>

<OptionsMenuDivider />
