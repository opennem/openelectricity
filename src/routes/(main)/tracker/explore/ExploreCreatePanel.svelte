<script>
	import { BarChart3, LayoutTemplate } from '@lucide/svelte';

	/** @type {{onoverview?:()=>void,onblank?:()=>void}} */
	let { onoverview, onblank } = $props();
</script>

<div class="space-y-5 p-5">
	<div>
		<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">Create view</p>
		<h2 class="m-0 mt-1 text-lg font-semibold text-dark-grey">Choose a starting point</h2>
		<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
			Use the current overview as a head start, or begin with an empty canvas.
		</p>
	</div>

	<div class="space-y-3">
		<button
			type="button"
			class="group flex w-full items-start gap-4 rounded-xl border border-mid-warm-grey bg-white p-4 text-left transition hover:border-dark-grey hover:shadow-sm"
			onclick={onoverview}
		>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-dark-grey text-white"
			>
				<LayoutTemplate class="size-5" />
			</span>
			<span>
				<span class="block text-sm font-semibold text-dark-grey">Use this overview</span>
				<span class="mt-1 block text-xs leading-relaxed text-mid-grey">
					Copy the four existing charts into a saved, editable view.
				</span>
			</span>
		</button>

		<button
			type="button"
			class="group flex w-full items-start gap-4 rounded-xl border border-warm-grey bg-light-warm-grey/40 p-4 text-left transition hover:border-dark-grey hover:bg-white"
			onclick={onblank}
		>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-mid-warm-grey bg-white text-dark-grey"
			>
				<BarChart3 class="size-5" />
			</span>
			<span>
				<span class="block text-sm font-semibold text-dark-grey">Start blank</span>
				<span class="mt-1 block text-xs leading-relaxed text-mid-grey">
					Create an empty one-column view and choose the first data source.
				</span>
			</span>
		</button>
	</div>
</div>
