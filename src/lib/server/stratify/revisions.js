/**
 * Stratify chart revisions: one schemaless `stratifyChartRevision` Sanity
 * document per save, written in the same transaction as the chart change.
 *
 * `parentRev` is the chart `_rev` the save replaced, so the saves made on
 * top of any chart revision can be found from it (the next revision's
 * `parentRev` is the `_rev` this one produced). `fields` lists the changed
 * keys as a native array so GROQ can read them cheaply; `changes` holds the
 * full before/after values as a JSON string, as other structured chart
 * fields are stored.
 */

import { chartFieldDefault, getChartField, isSameFieldValue } from '$lib/stratify/chart-fields.js';
import { MERGE_WINDOW_MS, REVISION_LIMIT } from '$lib/stratify/revision-policy.js';

export const REVISION_TYPE = 'stratifyChartRevision';

/** How many field labels a summary names before "and N more". */
const SUMMARY_LABEL_LIMIT = 3;

/**
 * @typedef {'baseline' | 'edit' | 'publish' | 'unpublish' | 'restore' | 'collaborator'} RevisionKind
 */

/**
 * @typedef {Object} RevisionAuthor
 * @property {string | null} userId
 * @property {string | null} userEmail
 */

/**
 * @typedef {Object} RestoredFrom
 * @property {string} revisionId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} RevisionSummary
 * @property {string} _id
 * @property {RevisionKind} kind
 * @property {string} summary
 * @property {string[]} fields
 * @property {string | null} userEmail
 * @property {string} createdAt
 * @property {string | null} updatedAt - Last save folded into this entry, if any
 * @property {RestoredFrom | null} restoredFrom
 */

/**
 * @typedef {RevisionSummary & { changes: import('$lib/stratify/chart-fields.js').ChartFieldChange[] }} RevisionDetail
 */

/**
 * @typedef {Object} LaterRevision
 * @property {string[]} fields
 * @property {string | null} userEmail
 * @property {string} createdAt
 */

/**
 * Classify a save by the publish state it moves the chart to.
 * @param {Record<string, any>} values - Incoming field values
 * @param {string | undefined} currentStatus
 * @returns {RevisionKind}
 */
export function revisionKind(values, currentStatus) {
	if (values.status === 'published' && currentStatus !== 'published') return 'publish';
	if (values.status === 'draft' && currentStatus === 'published') return 'unpublish';
	return 'edit';
}

/**
 * One-line description of a revision, e.g. "Title, Chart type and 2 more"
 * or "Published with changes to Title".
 * @param {RevisionKind} kind
 * @param {string[]} fields
 * @returns {string}
 */
export function summariseRevision(kind, fields) {
	if (kind === 'baseline') return 'History starts';

	const labels = fields
		.map((key) => getChartField(key))
		.filter((field) => field && field.group !== 'meta')
		.map(
			(field) => /** @type {import('$lib/stratify/chart-fields.js').ChartField} */ (field).label
		);
	const named = labels.slice(0, SUMMARY_LABEL_LIMIT).join(', ');
	const rest = labels.length - SUMMARY_LABEL_LIMIT;
	const list = rest > 0 ? `${named} and ${rest} more` : named;

	if (kind === 'publish') return list ? `Published with changes to ${list}` : 'Published';
	if (kind === 'unpublish') return list ? `Unpublished with changes to ${list}` : 'Unpublished';
	if (kind === 'restore') return list ? `Restored ${list}` : 'Restored';
	return list || 'No changes';
}

/**
 * Revision document for one save.
 * @param {{
 *   chartId: string,
 *   parentRev: string,
 *   kind: RevisionKind,
 *   changes: import('$lib/stratify/chart-fields.js').ChartFieldChange[],
 *   author: RevisionAuthor,
 *   createdAt: string,
 *   restoredFrom?: RestoredFrom | null,
 *   summary?: string
 * }} input - `summary` overrides the one built from the changed fields
 */
export function buildRevision({
	chartId,
	parentRev,
	kind,
	changes,
	author,
	createdAt,
	restoredFrom = null,
	summary
}) {
	const fields = changes.map((change) => change.field);
	return {
		_type: REVISION_TYPE,
		chartId,
		parentRev,
		kind,
		fields,
		changes: JSON.stringify(changes),
		summary: summary ?? summariseRevision(kind, fields),
		userId: author.userId,
		userEmail: author.userEmail,
		createdAt,
		restoredFrom
	};
}

/**
 * Marker for a chart saved before revisions existed: written once, with
 * the first logged save, at the chart's last-updated time and attributed
 * to its owner. `rev` records the chart revision it stands for. Later
 * revisions carry the before values needed to step back to it.
 * @param {Record<string, any>} chart - Raw Sanity chart document
 */
export function buildBaselineRevision(chart) {
	return {
		_type: REVISION_TYPE,
		chartId: chart._id,
		rev: chart._rev,
		parentRev: null,
		kind: /** @type {RevisionKind} */ ('baseline'),
		fields: [],
		changes: '[]',
		summary: summariseRevision('baseline', []),
		userId: chart.userId ?? null,
		userEmail: chart.userEmail ?? null,
		// Full ISO precision, so string ordering matches time ordering against
		// later revisions (Sanity's _updatedAt has no milliseconds).
		createdAt: new Date(chart._updatedAt ?? chart._createdAt ?? 0).toISOString()
	};
}

/** The first revision saved on top of chart revision `$rev`. */
const START_AT = `*[_type == $type && chartId == $chartId && parentRev == $rev] | order(createdAt asc)[0].createdAt`;

const LATER_REVISIONS_QUERY = `{
	"start": ${START_AT},
	"revisions": *[_type == $type && chartId == $chartId && createdAt >= ${START_AT}] | order(createdAt asc) {
		fields, userEmail, createdAt
	}
}`;

/**
 * The revisions saved after chart revision `rev`, oldest first, or `null`
 * when `rev` is unknown to the log (saved before revisions existed, or
 * changed outside the builder).
 * @param {import('@sanity/client').SanityClient} client
 * @param {string} chartId
 * @param {string} rev
 * @returns {Promise<LaterRevision[] | null>}
 */
export async function findRevisionsAfter(client, chartId, rev) {
	const result = await client.fetch(LATER_REVISIONS_QUERY, {
		type: REVISION_TYPE,
		chartId,
		rev
	});
	return result?.start ? (result.revisions ?? []) : null;
}

/**
 * Delete every revision of a chart, alongside the chart itself.
 * @param {import('@sanity/client').SanityClient} client
 * @param {string} chartId
 */
export async function deleteChartWithRevisions(client, chartId) {
	await client.mutate([
		{ delete: { id: chartId } },
		{
			delete: {
				query: `*[_type == $type && chartId == $chartId]`,
				params: { type: REVISION_TYPE, chartId }
			}
		}
	]);
}

/** Revisions per history page. */
export const REVISION_PAGE_SIZE = 30;

const SUMMARY_PROJECTION = `{ _id, kind, summary, fields, userEmail, createdAt, updatedAt, restoredFrom }`;

/**
 * One page of a chart's revisions, newest first. `before` is the
 * `createdAt` of the last revision on the previous page.
 * @param {import('@sanity/client').SanityClient} client
 * @param {string} chartId
 * @param {{ before?: string | null, limit?: number }} [options]
 * @returns {Promise<{ revisions: RevisionSummary[], nextBefore: string | null }>}
 */
export async function listRevisions(
	client,
	chartId,
	{ before = null, limit = REVISION_PAGE_SIZE } = {}
) {
	const beforeClause = before ? ' && createdAt < $before' : '';
	// Fetch one extra to know whether another page follows.
	const docs = await client.fetch(
		`*[_type == $type && chartId == $chartId${beforeClause}] | order(createdAt desc)[0...${limit + 1}] ${SUMMARY_PROJECTION}`,
		{ type: REVISION_TYPE, chartId, ...(before ? { before } : {}) }
	);
	const revisions = docs.slice(0, limit).map(toSummary);
	return {
		revisions,
		nextBefore: docs.length > limit ? revisions[revisions.length - 1].createdAt : null
	};
}

/**
 * @param {Record<string, any>} doc
 * @returns {RevisionSummary}
 */
function toSummary(doc) {
	return {
		_id: doc._id,
		kind: doc.kind,
		summary: doc.summary ?? '',
		fields: doc.fields ?? [],
		userEmail: doc.userEmail ?? null,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt ?? null,
		restoredFrom: doc.restoredFrom ?? null
	};
}

/**
 * @param {string | undefined} changes - JSON-encoded change list
 * @returns {import('$lib/stratify/chart-fields.js').ChartFieldChange[]}
 */
export function parseChanges(changes) {
	try {
		const parsed = JSON.parse(changes ?? '[]');
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Chart settings to revert to reach the chart as it was right after a
 * revision: the `before` value of every setting changed by a newer
 * revision, applied newest first so the oldest newer change wins. Publish
 * state is not part of a version. A value the chart never stored
 * (`before` missing) falls back to the field default.
 * @param {Array<{ changes: import('$lib/stratify/chart-fields.js').ChartFieldChange[] }>} newerRevisions - Newest first
 * @returns {Record<string, any>}
 */
export function revertedSettings(newerRevisions) {
	/** @type {Record<string, any>} */
	const values = {};
	for (const revision of newerRevisions) {
		for (const { field, before } of revision.changes) {
			const definition = getChartField(field);
			if (!definition || definition.group === 'meta') continue;
			values[field] = before === undefined ? chartFieldDefault(definition) : before;
		}
	}
	return values;
}

const REVISION_BY_ID = `*[_type == $type && _id == $revisionId && chartId == $chartId][0]`;

const VERSION_QUERY = `{
	"revision": ${REVISION_BY_ID} {
		_id, kind, summary, fields, userEmail, createdAt, updatedAt, restoredFrom, changes
	},
	"newer": *[_type == $type && chartId == $chartId && createdAt > ${REVISION_BY_ID}.createdAt] | order(createdAt desc) { changes }
}`;

/**
 * A revision with its changes, and the chart's settings as they were right
 * after it (for previews and restores). `chart` is the decoded current
 * chart; the result keeps its metadata and publish state.
 * @param {import('@sanity/client').SanityClient} client
 * @param {Record<string, any>} chart - Decoded current chart
 * @param {string} revisionId
 * @returns {Promise<{ revision: RevisionDetail, chart: Record<string, any>, restore: Record<string, any> } | null>}
 */
export async function getRevisionVersion(client, chart, revisionId) {
	const result = await client.fetch(VERSION_QUERY, {
		type: REVISION_TYPE,
		chartId: chart._id,
		revisionId
	});
	if (!result?.revision) return null;

	const restore = revertedSettings(
		(result.newer ?? []).map((/** @type {{ changes?: string }} */ doc) => ({
			changes: parseChanges(doc.changes)
		}))
	);
	return {
		revision: { ...toSummary(result.revision), changes: parseChanges(result.revision.changes) },
		chart: { ...chart, ...restore },
		restore
	};
}

/**
 * @typedef {Object} HistoryEntry
 * @property {string} _id
 * @property {string} _rev
 * @property {RevisionKind} kind
 * @property {string | null} userId
 * @property {string} createdAt
 */

/**
 * Whether a save should fold into the chart's newest revision: both plain
 * edits, by the same person, within the merge window of that entry's first
 * save. Publishes, restores and the baseline always stay separate entries.
 * @param {HistoryEntry | null} latest
 * @param {RevisionKind} kind - The incoming save's kind
 * @param {RevisionAuthor} author
 * @param {Date} now
 * @returns {latest is HistoryEntry}
 */
export function canMergeInto(latest, kind, author, now) {
	return (
		latest !== null &&
		kind === 'edit' &&
		latest.kind === 'edit' &&
		author.userId !== null &&
		latest.userId === author.userId &&
		now.getTime() - Date.parse(latest.createdAt) < MERGE_WINDOW_MS
	);
}

/**
 * Combine an entry's changes with a later save's: each field keeps its
 * earliest `before` and takes the latest `after`, and fields that end up
 * back where they started drop out.
 * @param {import('$lib/stratify/chart-fields.js').ChartFieldChange[]} earlier
 * @param {import('$lib/stratify/chart-fields.js').ChartFieldChange[]} later
 * @returns {import('$lib/stratify/chart-fields.js').ChartFieldChange[]}
 */
export function mergeChanges(earlier, later) {
	const byField = new Map(earlier.map((change) => [change.field, change]));
	for (const change of later) {
		const previous = byField.get(change.field);
		byField.set(change.field, previous ? { ...change, before: previous.before } : change);
	}
	return [...byField.values()].filter((change) => !isSameFieldValue(change.before, change.after));
}

/**
 * How far past the limit one save looks for revisions to prune. Saves keep
 * a chart at the limit, so only concurrent saves can overshoot, and any
 * excess beyond this is caught by later saves.
 */
const PRUNE_SCAN = 20;

/**
 * A chart's newest revisions, enough to merge into and prune: a GROQ
 * expression taking `$type` and `$id`.
 */
export const RECENT_HISTORY_QUERY = `*[_type == $type && chartId == $id] | order(createdAt desc)[0...${REVISION_LIMIT + PRUNE_SCAN}] {
	_id, _rev, kind, userId, createdAt
}`;

/**
 * Revisions to delete so the chart keeps its newest REVISION_LIMIT.
 * @param {HistoryEntry[]} history - Newest first (RECENT_HISTORY_QUERY)
 * @param {boolean} adding - Whether this transaction adds a revision
 * @returns {string[]}
 */
export function revisionsToPrune(history, adding) {
	return history.slice(adding ? REVISION_LIMIT - 1 : REVISION_LIMIT).map((entry) => entry._id);
}
