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

import { getChartField } from '$lib/stratify/chart-fields.js';

export const REVISION_TYPE = 'stratifyChartRevision';

/** How many field labels a summary names before "and N more". */
const SUMMARY_LABEL_LIMIT = 3;

/**
 * @typedef {'baseline' | 'edit' | 'publish' | 'unpublish'} RevisionKind
 */

/**
 * @typedef {Object} RevisionAuthor
 * @property {string | null} userId
 * @property {string | null} userEmail
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
 *   createdAt: string
 * }} input
 */
export function buildRevision({ chartId, parentRev, kind, changes, author, createdAt }) {
	const fields = changes.map((change) => change.field);
	return {
		_type: REVISION_TYPE,
		chartId,
		parentRev,
		kind,
		fields,
		changes: JSON.stringify(changes),
		summary: summariseRevision(kind, fields),
		userId: author.userId,
		userEmail: author.userEmail,
		createdAt
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
		createdAt: chart._updatedAt ?? chart._createdAt ?? new Date(0).toISOString()
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
