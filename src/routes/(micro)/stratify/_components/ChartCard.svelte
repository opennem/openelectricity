<script>
	import { timeAgo } from '../_utils/format.js';
	import ChartThumbnail from './ChartThumbnail.svelte';

	/**
	 * @type {{
	 *   chart: import('../_utils/api.js').ChartDoc,
	 *   variant: 'my' | 'community',
	 *   isSuperAdmin?: boolean,
	 *   deleting?: boolean,
	 *   forking?: boolean,
	 *   onduplicate?: () => void,
	 *   ondelete?: () => void,
	 *   onfork?: () => void
	 * }}
	 */
	let {
		chart,
		variant,
		isSuperAdmin = false,
		deleting = false,
		forking = false,
		onduplicate,
		ondelete,
		onfork
	} = $props();

	let href = $derived(variant === 'my' ? `/stratify/${chart._id}` : `/strata/${chart._id}`);
	let target = $derived(variant === 'community' ? '_blank' : undefined);
	let isDraft = $derived(chart.status !== 'published');

	const actionClass = 'text-[11px] text-mid-grey hover:text-dark-grey py-0.5';
	const dangerActionClass =
		'text-[11px] text-mid-grey hover:text-dark-red disabled:opacity-40 py-0.5';
</script>

<div
	class="group rounded-xl overflow-hidden transition-all flex flex-col hover:shadow-sm {isDraft
		? 'border border-dashed border-mid-warm-grey bg-light-warm-grey/40 hover:border-mid-grey'
		: 'border border-warm-grey bg-white hover:border-mid-warm-grey'}"
>
	<a {href} {target} aria-label={chart.title || 'Untitled'} class="relative block">
		<ChartThumbnail {chart} muted={isDraft} />
		{#if !isDraft}
			<span
				class="absolute top-[14px] -right-[34px] w-[120px] rotate-45 bg-black text-white text-center text-[8px] tracking-tight py-1 pointer-events-none z-10"
			>
				published
			</span>
		{/if}
	</a>

	<div
		class="px-3 py-2.5 border-t {isDraft
			? 'border-dashed border-mid-warm-grey'
			: 'border-warm-grey'}"
	>
		<div class="flex items-center gap-2 mb-1">
			<a
				{href}
				{target}
				class="font-sans text-[13px] font-medium leading-snug text-dark-grey truncate hover:text-red flex-1 min-w-0"
			>
				{chart.title || 'Untitled'}
			</a>
			{#if isDraft}
				<span
					class="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 bg-warm-grey text-mid-grey"
				>
					Draft
				</span>
			{/if}
		</div>
		<div class="flex items-center justify-between min-h-5">
			<span class="text-[10px] text-mid-grey truncate inline-flex items-center gap-1.5">
				{#if variant === 'community'}
					<span class="truncate">{chart.userEmail || 'Unknown'}</span>
					&middot;
				{/if}
				{timeAgo(chart._updatedAt)}
			</span>
			<div
				class="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity"
			>
				{#if variant === 'my'}
					<button type="button" onclick={() => onduplicate?.()} class={actionClass}>
						Duplicate
					</button>
					<button
						type="button"
						onclick={() => ondelete?.()}
						disabled={deleting}
						class={dangerActionClass}
					>
						{deleting ? '...' : 'Delete'}
					</button>
				{:else}
					<button
						type="button"
						onclick={() => onfork?.()}
						disabled={forking}
						class="{actionClass} disabled:opacity-40"
					>
						{forking ? 'Forking...' : 'Fork'}
					</button>
					{#if isSuperAdmin}
						<a href="/stratify/{chart._id}" class={actionClass}> Edit </a>
						<button
							type="button"
							onclick={() => ondelete?.()}
							disabled={deleting}
							class={dangerActionClass}
						>
							{deleting ? '...' : 'Delete'}
						</button>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
