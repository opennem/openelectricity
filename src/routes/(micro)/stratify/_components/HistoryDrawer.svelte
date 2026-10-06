<script>
	import { Sheet } from '$lib/components/ui/sheet';
	import { getChartField } from '$lib/stratify/chart-fields.js';
	import { REVISION_LIMIT } from '$lib/stratify/revision-policy.js';
	import { getStratifyContext, getChartSaveContext } from '../_state/context.js';
	import { getRevision, listRevisions } from '../_utils/api.js';
	import { describeDataChange, describeFieldValue, isColourValue } from '../_utils/field-values.js';
	import {
		formatRevisionDateTime,
		formatRevisionTime,
		groupRevisionsByDay
	} from '../_utils/history.js';
	import StratifyButton from './StratifyButton.svelte';

	/**
	 * @typedef {import('../_utils/api.js').RevisionSummary} RevisionSummary
	 * @typedef {import('../_utils/api.js').RevisionDetail} RevisionDetail
	 * @typedef {{ status: 'loading' } | { status: 'error' } | { status: 'ready', revision: RevisionDetail, chart: Record<string, any> }} Detail
	 */

	/**
	 * @type {{
	 *   open: boolean,
	 *   previewingId?: string | null,
	 *   error?: string | null,
	 *   onclose: () => void,
	 *   onpreview: (revision: RevisionSummary, chart: Record<string, any>) => void,
	 *   onrestore: (revision: RevisionSummary) => void
	 * }}
	 */
	let { open, previewingId = null, error = null, onclose, onpreview, onrestore } = $props();

	const project = getStratifyContext();
	const saveSession = getChartSaveContext();

	/** Badge text by revision kind; plain edits have none. */
	const KIND_LABELS = /** @type {Record<string, string>} */ ({
		publish: 'Published',
		unpublish: 'Unpublished',
		restore: 'Restored',
		collaborator: 'Sharing',
		baseline: 'Start'
	});

	/** Bookkeeping fields left out of a revision's change list. */
	const HIDDEN_FIELDS = ['publishedAt', 'version'];

	/** @type {RevisionSummary[]} */
	let revisions = $state.raw([]);
	/** @type {string | null} */
	let nextBefore = $state(null);
	/** @type {'loading' | 'ready' | 'error'} */
	let listStatus = $state('loading');
	let loadingMore = $state(false);
	/** @type {string | null} */
	let expandedId = $state(null);
	/** @type {Record<string, Detail>} */
	let details = $state.raw({});

	const groups = $derived(groupRevisionsByDay(revisions));
	const currentId = $derived(revisions[0]?._id ?? null);
	const busy = $derived(saveSession.action !== null);

	/** Reload whenever the drawer opens or the chart is saved or restored. */
	const historyKey = $derived(
		open && project.currentChartId ? `${project.currentChartId}:${saveSession.rev}` : null
	);

	/** Guards against out-of-order responses when the history reloads. */
	let request = 0;

	$effect(() => {
		if (historyKey && project.currentChartId) loadFirstPage(project.currentChartId);
	});

	/** @param {string} chartId */
	async function loadFirstPage(chartId) {
		const token = ++request;
		listStatus = 'loading';
		expandedId = null;
		details = {};
		try {
			const page = await listRevisions(chartId);
			if (token !== request) return;
			revisions = page.revisions;
			nextBefore = page.nextBefore;
			listStatus = 'ready';
		} catch {
			if (token === request) listStatus = 'error';
		}
	}

	async function loadMore() {
		const chartId = project.currentChartId;
		if (!chartId || !nextBefore || loadingMore) return;
		const token = request;
		loadingMore = true;
		try {
			const page = await listRevisions(chartId, nextBefore);
			if (token !== request) return;
			revisions = [...revisions, ...page.revisions];
			nextBefore = page.nextBefore;
		} catch {
			// Leave the button to retry.
		} finally {
			loadingMore = false;
		}
	}

	/** @param {RevisionSummary} revision */
	async function toggle(revision) {
		expandedId = expandedId === revision._id ? null : revision._id;
		const chartId = project.currentChartId;
		if (!expandedId || !chartId || details[revision._id]?.status === 'ready') return;

		const token = request;
		details = { ...details, [revision._id]: { status: 'loading' } };
		try {
			const result = await getRevision(chartId, revision._id);
			if (token !== request) return;
			details = { ...details, [revision._id]: { status: 'ready', ...result } };
		} catch {
			if (token === request) details = { ...details, [revision._id]: { status: 'error' } };
		}
	}

	/** @param {RevisionSummary} revision */
	function headline(revision) {
		if (revision.kind === 'restore' && revision.restoredFrom) {
			return `Restored the version from ${formatRevisionDateTime(revision.restoredFrom.createdAt)}`;
		}
		if (revision.kind === 'baseline') return 'Before change tracking';
		return revision.summary;
	}
</script>

{#snippet fieldValue(/** @type {string} */ field, /** @type {unknown} */ value)}
	<span class="inline-flex items-center gap-1">
		{#if isColourValue(value)}
			<span
				class="inline-block size-3 shrink-0 rounded-sm border border-warm-grey"
				style:background-color={value}
			></span>
		{/if}
		{describeFieldValue(field, value)}
	</span>
{/snippet}

{#snippet changeList(/** @type {RevisionDetail} */ revision)}
	{@const changes = revision.changes.filter((change) => !HIDDEN_FIELDS.includes(change.field))}
	{#if revision.kind === 'collaborator'}
		<p class="m-0 text-xs text-mid-grey">Sharing changed; the chart itself didn't.</p>
	{:else if changes.length === 0}
		<p class="m-0 text-xs text-mid-grey">The chart as it was when change tracking began.</p>
	{:else}
		<ul class="m-0 flex list-none flex-col gap-2 p-0">
			{#each changes as change (change.field)}
				<li class="text-xs leading-relaxed">
					<span class="font-semibold text-dark-grey"
						>{getChartField(change.field)?.label ?? change.field}</span
					>
					<span class="block break-words text-mid-grey">
						{#if change.field === 'csvText'}
							{describeDataChange(change.before, change.after)}
						{:else}
							{@render fieldValue(change.field, change.before)}
							<span aria-label="changed to"> → </span>
							{@render fieldValue(change.field, change.after)}
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<Sheet {open} {onclose} title="History" side="left" size="440px" align="stretch" rounded={false}>
	<div class="flex flex-col gap-6 px-6 py-5">
		{#if error}
			<p class="m-0 rounded-lg bg-light-warm-grey px-3 py-2 text-xs text-red">{error}</p>
		{/if}

		{#if listStatus === 'loading'}
			<p class="m-0 text-sm text-mid-grey">Loading history…</p>
		{:else if listStatus === 'error'}
			<p class="m-0 text-sm text-mid-grey">
				History couldn't be loaded. Close and reopen to retry.
			</p>
		{:else if revisions.length === 0}
			<p class="m-0 text-sm text-mid-grey">
				No changes recorded yet. Every save from now on is listed here.
			</p>
		{:else}
			{#each groups as group (group.label)}
				<section>
					<h3 class="mb-2 font-space text-xxs font-medium uppercase tracking-wider text-mid-grey">
						{group.label}
					</h3>
					<ol class="m-0 flex list-none flex-col gap-2 p-0">
						{#each group.revisions as revision (revision._id)}
							{@const expanded = expandedId === revision._id}
							{@const detail = details[revision._id]}
							{@const isCurrent = revision._id === currentId}
							<li
								class="rounded-lg border {previewingId === revision._id
									? 'border-dark-grey'
									: 'border-warm-grey'}"
							>
								<button
									type="button"
									class="flex w-full cursor-pointer flex-col gap-1 bg-transparent px-3 py-2 text-left"
									aria-expanded={expanded}
									onclick={() => toggle(revision)}
								>
									<span class="flex items-center gap-2 text-xxs text-mid-grey">
										<span>{formatRevisionTime(revision.updatedAt ?? revision.createdAt)}</span>
										<span class="truncate">{revision.userEmail ?? 'Unknown'}</span>
										{#if isCurrent}
											<span
												class="ml-auto rounded-full bg-dark-grey px-2 py-0.5 font-space uppercase tracking-wider text-white"
												>Current</span
											>
										{:else if KIND_LABELS[revision.kind]}
											<span
												class="ml-auto rounded-full bg-warm-grey px-2 py-0.5 font-space uppercase tracking-wider"
												>{KIND_LABELS[revision.kind]}</span
											>
										{/if}
									</span>
									<span class="text-sm text-dark-grey">{headline(revision)}</span>
								</button>

								{#if expanded}
									<div class="flex flex-col gap-3 border-t border-warm-grey px-3 py-3">
										{#if !detail || detail.status === 'loading'}
											<p class="m-0 text-xs text-mid-grey">Loading changes…</p>
										{:else if detail.status === 'error'}
											<p class="m-0 text-xs text-mid-grey">These changes couldn't be loaded.</p>
										{:else}
											{@render changeList(detail.revision)}
											{#if !isCurrent}
												<div class="flex flex-wrap gap-2">
													<StratifyButton
														onclick={() => onpreview(revision, detail.chart)}
														disabled={busy}
													>
														Preview
													</StratifyButton>
													{#if saveSession.can('restore')}
														<StratifyButton
															variant="primary"
															onclick={() => onrestore(revision)}
															disabled={busy}
														>
															{saveSession.action === 'restore'
																? 'Restoring…'
																: 'Restore this version'}
														</StratifyButton>
													{/if}
												</div>
											{/if}
										{/if}
									</div>
								{/if}
							</li>
						{/each}
					</ol>
				</section>
			{/each}

			{#if nextBefore}
				<StratifyButton onclick={loadMore} disabled={loadingMore}>
					{loadingMore ? 'Loading…' : 'Show earlier changes'}
				</StratifyButton>
			{/if}

			<p class="m-0 text-xxs leading-relaxed text-mid-grey">
				Each chart keeps its latest {REVISION_LIMIT} changes. Saves you make within a few minutes of each
				other are combined into one.
			</p>
		{/if}
	</div>
</Sheet>
