<script>
	import { getStratifyContext } from '../../_state/context.js';
	import { exportToFile, importFromFile } from '../../_utils/storage.js';
	import { createChart, updateChart } from '../../_utils/api.js';

	const project = getStratifyContext();

	/** @type {string} */
	let statusMessage = $state('');
	let publishing = $state(false);
	let copied = $state(false);

	let isPublished = $derived(project.status === 'published');
	let shareUrl = $derived(
		project.currentChartId ? `${window.location.origin}/strata/${project.currentChartId}` : ''
	);
	let embedCode = $derived(
		shareUrl
			? `<iframe src="${shareUrl}" width="100%" height="${project.chartHeight + 120}" frameborder="0" style="border:0;max-width:1024px"></iframe>`
			: ''
	);

	async function handlePublish() {
		if (!project.hasData) return;
		publishing = true;
		statusMessage = '';

		try {
			// Save first if not yet saved
			if (!project.currentChartId) {
				const result = await createChart(project.toJSON());
				project.currentChartId = result._id;
			}

			await updateChart(project.currentChartId, {
				...project.toJSON(),
				status: 'published',
				publishedAt: new Date().toISOString()
			});
			project.status = 'published';
			statusMessage = 'Published';
		} catch (e) {
			statusMessage = `Error: ${e instanceof Error ? e.message : 'Failed to publish'}`;
		} finally {
			publishing = false;
		}
	}

	async function handleUnpublish() {
		if (!project.currentChartId) return;
		publishing = true;
		statusMessage = '';

		try {
			await updateChart(project.currentChartId, {
				status: 'draft',
				publishedAt: null
			});
			project.status = 'draft';
			statusMessage = 'Unpublished';
		} catch (e) {
			statusMessage = `Error: ${e instanceof Error ? e.message : 'Failed to unpublish'}`;
		} finally {
			publishing = false;
		}
	}

	async function handleToggleBranding() {
		project.showBranding = !project.showBranding;
		if (project.currentChartId) {
			try {
				await updateChart(project.currentChartId, { showBranding: project.showBranding });
			} catch {
				// Silently fail — will be saved on next auto-save
			}
		}
	}

	/** @param {string} text */
	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Fallback: select input text
		}
	}

	function handleExportJSON() {
		if (!project.hasData) return;
		exportToFile(project.toJSON());
	}

	async function handleImportJSON() {
		statusMessage = '';
		const snapshot = await importFromFile();
		if (!snapshot) return;

		project.loadFromSnapshot(snapshot);
		project.currentChartId = null;
		statusMessage = 'Imported';
	}

	async function handleExportSVG() {
		const { captureSVG, downloadSVG } = await import('../../_utils/export.js');
		const container = document.querySelector('.chart-preview');
		if (!container) return;
		const svg = captureSVG(/** @type {HTMLElement} */ (container));
		if (svg) downloadSVG(svg, `${project.title || 'chart'}.svg`);
	}

	async function handleExportPNG() {
		const { downloadPNG } = await import('../../_utils/export.js');
		const container = document.querySelector('.chart-preview');
		if (!container) return;
		await downloadPNG(/** @type {HTMLElement} */ (container), `${project.title || 'chart'}.png`);
	}
</script>

<div class="space-y-6">
	<!-- Publish / Unpublish -->
	<div>
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Status</span
		>

		{#if isPublished}
			<div class="flex items-center gap-2 mb-3">
				<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Published</span>
				<button
					type="button"
					onclick={handleUnpublish}
					disabled={publishing}
					class="text-[11px] text-mid-grey underline hover:text-dark-grey disabled:opacity-40"
				>
					Unpublish
				</button>
			</div>
		{:else}
			<button
				type="button"
				onclick={handlePublish}
				disabled={!project.hasData || publishing}
				class="w-full rounded-lg bg-dark-grey px-3 py-2 text-xs text-white hover:bg-black disabled:opacity-40 disabled:pointer-events-none"
			>
				{publishing ? 'Publishing...' : 'Publish'}
			</button>
		{/if}

		{#if statusMessage}
			<p
				class="text-xs mt-1 {statusMessage.startsWith('Error')
					? 'text-dark-red'
					: 'text-mid-grey'}"
			>
				{statusMessage}
			</p>
		{/if}
	</div>

	<!-- Embed / Share (only when published) -->
	{#if isPublished && shareUrl}
		<div class="border-t border-mid-warm-grey pt-6">
			<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
				>Share / Embed</span
			>

			<!-- Direct link -->
			<div class="mb-3">
				<span class="block text-[10px] text-mid-grey mb-1">Direct link</span>
				<div class="flex gap-1">
					<input
						type="text"
						readonly
						value={shareUrl}
						class="flex-1 bg-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] font-mono"
					/>
					<button
						type="button"
						onclick={() => copyToClipboard(shareUrl)}
						class="rounded border border-warm-grey px-2 py-1 text-[11px] hover:border-dark-grey"
					>
						{copied ? 'Copied' : 'Copy'}
					</button>
				</div>
			</div>

			<!-- Embed code -->
			<div class="mb-3">
				<span class="block text-[10px] text-mid-grey mb-1">iframe embed</span>
				<textarea
					readonly
					rows="2"
					value={embedCode}
					class="w-full bg-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[10px] font-mono resize-none"
				></textarea>
				<button
					type="button"
					onclick={() => copyToClipboard(embedCode)}
					class="mt-1 text-[11px] text-mid-grey underline hover:text-dark-grey"
				>
					Copy embed code
				</button>
			</div>

			<!-- Branding toggle -->
			<label class="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={project.showBranding}
					onchange={handleToggleBranding}
					class="rounded border-warm-grey"
				/>
				<span class="text-[11px] text-mid-grey">Show Open Electricity attribution</span>
			</label>
		</div>
	{/if}

	<!-- Image Export -->
	<div class="border-t border-mid-warm-grey pt-6">
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Export image</span
		>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={handleExportSVG}
				disabled={!project.hasData}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey disabled:opacity-40 disabled:pointer-events-none"
			>
				Download SVG
			</button>
			<button
				type="button"
				onclick={handleExportPNG}
				disabled={!project.hasData}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey disabled:opacity-40 disabled:pointer-events-none"
			>
				Download PNG
			</button>
		</div>
	</div>

	<!-- JSON Export/Import -->
	<div class="border-t border-mid-warm-grey pt-6">
		<span class="block text-xs font-semibold mb-2 text-mid-grey uppercase tracking-wider"
			>Export / Import config</span
		>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={handleExportJSON}
				disabled={!project.hasData}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey disabled:opacity-40 disabled:pointer-events-none"
			>
				Export JSON
			</button>
			<button
				type="button"
				onclick={handleImportJSON}
				class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey"
			>
				Import JSON
			</button>
		</div>
	</div>
</div>
