<script>
	/** @type {{ active: boolean }} */
	let { active } = $props();
</script>

<div
	class="loading-overlay pointer-events-none absolute inset-0 z-30 overflow-hidden"
	data-active={active}
	data-testid="tracker-loading-overlay"
	aria-hidden="true"
></div>

<style>
	.loading-overlay {
		border-radius: inherit;
		background: rgb(255 255 255 / 65%);
		opacity: 0;
		transition: opacity 240ms ease;
	}
	.loading-overlay[data-active='true'] {
		opacity: 1;
	}
	.loading-overlay[data-active='true']::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			100deg,
			transparent 15%,
			rgb(255 255 255 / 70%) 50%,
			transparent 85%
		);
		animation: loading-sweep 2s ease-in-out infinite;
	}
	@keyframes loading-sweep {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(100%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.loading-overlay {
			transition: none;
		}
		.loading-overlay::after {
			animation: none !important;
		}
	}
</style>
