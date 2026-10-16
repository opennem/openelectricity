<script>
	import { version } from '$app/environment';
	import { ChevronRight, ExternalLink } from '@lucide/svelte';
	import { ModalSheet } from '$lib/components/ui/bottom-sheet';
	import { API_STATUS_URL, apiStatusLabel } from '$lib/api-status.js';
	import ApiStatusDot from '$lib/components/ApiStatusDot.svelte';
	import { DATA_SOURCES, RESOURCE_LINKS } from '$lib/components/fullscreen/site-links.js';

	/**
	 * TrackerAboutSheet — the phone About (below 768px), opened from the
	 * options menu's last item. It holds what the fullscreen footer shows from
	 * 768px up, as grouped rows in a `ModalSheet`: the build version and the
	 * API status (a link to the status page), the data sources, and Open
	 * Electricity's platform, documentation and licence. The shell owns the
	 * status (`createApiStatusState`), shared with the options menu's dot:
	 * undefined until the first check answers, null when it failed.
	 *
	 * @type {{
	 *   open: boolean,
	 *   onclose: () => void,
	 *   apiStatus: import('$lib/api-status.js').ApiStatusSummary | null | undefined
	 * }}
	 */
	let { open, onclose, apiStatus } = $props();

	const GROUP =
		'm-0 flex list-none flex-col divide-y divide-warm-grey overflow-hidden rounded-xl border border-warm-grey bg-white p-0';
	const ROW =
		'flex items-center gap-3 px-4 text-dark-grey no-underline transition-colors hover:bg-light-warm-grey hover:text-dark-grey hover:no-underline';
	const HEADING = 'm-0 ml-1 font-space text-xs font-medium uppercase text-mid-grey';
</script>

<ModalSheet {open} {onclose} title="About" fraction={0.8} class="tablet:hidden">
	<div
		class="flex min-h-full flex-col gap-5 bg-light-warm-grey px-4 py-4 text-sm"
		data-testid="tracker-about-sheet"
	>
		<ul class={GROUP}>
			<li class="flex h-12 items-center justify-between px-4">
				<span>Version</span>
				<span class="font-mono text-mid-grey" data-testid="tracker-about-version">v{version}</span>
			</li>
			<li>
				<a href={API_STATUS_URL} target="_blank" rel="noopener noreferrer" class="{ROW} h-12">
					<span class="flex-1">API status</span>
					<ApiStatusDot color={apiStatus?.statusColor} class="size-2" />
					<span class="text-mid-grey">{apiStatusLabel(apiStatus)}</span>
					<ChevronRight class="size-4 shrink-0 text-mid-warm-grey" aria-hidden="true" />
				</a>
			</li>
		</ul>

		<section class="flex flex-col gap-2" aria-labelledby="tracker-about-sources">
			<h3 id="tracker-about-sources" class={HEADING}>Data sources</h3>
			<ul class={GROUP}>
				{#each DATA_SOURCES as { href, label, description } (href)}
					<li>
						<a {href} target="_blank" rel="noopener noreferrer" class="{ROW} min-h-14 py-2">
							<span class="flex flex-1 flex-col gap-0.5">
								<span>{label}</span>
								<span class="text-xs text-mid-grey">{description}</span>
							</span>
							<ExternalLink class="size-4 shrink-0 text-mid-warm-grey" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<section class="flex flex-col gap-2" aria-labelledby="tracker-about-links">
			<h3 id="tracker-about-links" class={HEADING}>Open Electricity</h3>
			<ul class={GROUP}>
				{#each RESOURCE_LINKS as { href, label, icon: Icon } (href)}
					<li>
						<a {href} target="_blank" rel="noopener noreferrer" class="{ROW} h-12">
							<Icon
								class="size-[18px] shrink-0 text-mid-grey"
								strokeWidth={1.75}
								aria-hidden="true"
							/>
							<span class="flex-1">{label}</span>
							<ExternalLink class="size-4 shrink-0 text-mid-warm-grey" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</ModalSheet>
