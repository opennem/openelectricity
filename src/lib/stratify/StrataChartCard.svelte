<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';
	import { EllipsisVertical, ExternalLink, Link, Code, ClipboardCheck } from '@lucide/svelte';
	import { writeToClipboard } from '$lib/utils/clipboard';

	/**
	 * @type {{
	 *   chart: any,
	 *   headingTag?: 'h1' | 'h2' | 'h3',
	 *   showHeader?: boolean,
	 *   showBranding?: boolean,
	 *   showOpen?: boolean,
	 *   maxHeight?: string,
	 *   class?: string
	 * }}
	 */
	let {
		chart,
		headingTag = 'h2',
		showHeader = true,
		showBranding = false,
		showOpen = true,
		maxHeight = '',
		class: className = ''
	} = $props();

	let menuOpen = $state(false);
	let copied = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function copyLink() {
		writeToClipboard(`${window.location.origin}/strata/${chart._id}`);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
		menuOpen = false;
	}

	function copyEmbed() {
		const url = `${window.location.origin}/strata-embed/${chart._id}`;
		const height = chart.chartHeight ?? 400;
		const code = `<iframe src="${url}" width="100%" height="${height + 120}" frameborder="0" style="border:0;max-width:1024px"></iframe>`;
		writeToClipboard(code);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
		menuOpen = false;
	}
</script>

<div
	class="border border-warm-grey rounded-lg flex flex-col {maxHeight} {maxHeight
		? 'overflow-hidden'
		: ''} {className}"
>
	{#if showHeader}
		<header
			class="flex items-center justify-between px-6 py-3 border-b border-warm-grey bg-light-warm-grey"
		>
			<div class="min-w-0">
				<span class="text-xs text-mid-grey">{chart.userEmail}</span>
				<time class="block text-xs text-mid-grey">
					{new Date(chart.publishedAt).toLocaleDateString('en-AU', {
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})}
				</time>
			</div>

			<div
				class="relative"
				use:clickoutside
				onclickoutside={() => {
					menuOpen = false;
				}}
			>
				<button
					onclick={toggleMenu}
					class="px-3 py-6 rounded-lg hover:bg-warm-grey transition-colors cursor-pointer"
					title="More options"
				>
					<EllipsisVertical class="size-7 text-mid-grey" />
				</button>

				{#if menuOpen}
					<div
						class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-50 py-1 whitespace-nowrap"
						in:fly={{ y: -5, duration: 150 }}
					>
						{#if showOpen}
							<a
								href="/strata/{chart._id}"
								target="_blank"
								rel="noopener noreferrer"
								onclick={() => (menuOpen = false)}
								class="text-dark-grey w-full pl-3 pr-8 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey hover:no-underline transition-colors text-left"
							>
								<ExternalLink class="size-4 text-mid-grey" />
								<span class="flex-1">Open</span>
							</a>
						{/if}

						<button
							onclick={copyLink}
							class="w-full pl-3 pr-8 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
						>
							{#if copied}
								<ClipboardCheck class="size-4 text-mid-grey" />
							{:else}
								<Link class="size-4 text-mid-grey" />
							{/if}
							<span class="flex-1">{copied ? 'Copied!' : 'Copy link'}</span>
						</button>

						<button
							onclick={copyEmbed}
							class="w-full pl-3 pr-8 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
						>
							{#if copied}
								<ClipboardCheck class="size-4 text-mid-grey" />
							{:else}
								<Code class="size-4 text-mid-grey" />
							{/if}
							<span class="flex-1">{copied ? 'Copied!' : 'Copy embed code'}</span>
						</button>
					</div>
				{/if}
			</div>
		</header>
	{/if}

	<div class="p-6 {maxHeight ? 'overflow-y-auto' : ''}">
		<StrataChartView {chart} {headingTag} {showBranding} />
	</div>
</div>
