<script>
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';

	/** @type {{ label: string, loading: boolean }} */
	let { label, loading } = $props();
</script>

<div
	class="range-status relative h-[36px] w-0 shrink-0 overflow-hidden lg:w-auto lg:min-w-[36px]"
	data-loading={loading}
	data-testid="tracker-range-status"
>
	<span
		class="range-label hidden h-full items-center whitespace-nowrap text-sm font-bold text-dark-grey lg:flex"
		aria-hidden={loading}
		data-testid="tracker-range-label"
	>
		{label}
	</span>
	<div
		class="range-loader pointer-events-none absolute inset-0 flex items-center justify-end"
		role={loading ? 'status' : undefined}
		aria-label={loading ? 'Updating tracker' : undefined}
		aria-hidden={!loading}
		data-testid={loading ? 'tracker-loading' : undefined}
	>
		<LogoMarkLoader class="[&_svg]:size-[28px]" />
	</div>
</div>

<style>
	.range-label,
	.range-loader {
		transition:
			transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 200ms ease;
	}
	.range-loader {
		transform: translateX(100%);
		opacity: 0;
	}
	[data-loading='true'] .range-label {
		transform: translateX(100%);
		opacity: 0;
	}
	[data-loading='true'] .range-loader {
		transform: translateX(0);
		opacity: 1;
	}
	[data-loading='false'] .range-loader :global(svg) {
		animation: none;
	}
	@media (max-width: 1439px) {
		.range-status {
			transition: width 240ms ease;
		}
		.range-status[data-loading='true'] {
			width: 36px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.range-status,
		.range-label,
		.range-loader {
			transition: none;
		}
		.range-loader :global(svg) {
			animation: none;
		}
	}
</style>
