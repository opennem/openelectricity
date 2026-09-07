<script>
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';

	/** @type {{side: 'left' | 'right', open: boolean, label: string, controls: string,
	 * onclick: () => void, el?: HTMLButtonElement}} */
	let { side, open, label, controls, onclick, el = $bindable() } = $props();
	let Icon = $derived(
		side === 'left'
			? open
				? PanelLeftClose
				: PanelLeftOpen
			: open
				? PanelRightClose
				: PanelRightOpen
	);
</script>

<!-- Explicit pixels: the app's 10px rem base makes size-11 only 27.5px. -->
<button
	bind:this={el}
	type="button"
	{onclick}
	aria-label={label}
	aria-expanded={open}
	aria-controls={controls}
	title={label}
	class="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-md text-mid-grey transition-colors hover:bg-warm-grey active:bg-mid-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none"
>
	<Icon class="size-[16px]" strokeWidth={1.5} aria-hidden="true" />
</button>
