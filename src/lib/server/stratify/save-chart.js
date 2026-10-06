/**
 * Conflict-safe Stratify chart saves.
 *
 * A save sends only the fields it changed, with `baseRev`: the chart `_rev`
 * its editor started from. If the chart has moved on since, the revision
 * log says which fields other saves touched; overlapping fields that now
 * differ are a conflict (nothing is written), and anything else merges.
 * The chart patch and its revision document commit in one transaction,
 * guarded by `ifRevisionId`, so a save that races another is retried
 * against the newer chart rather than overwriting it.
 *
 * History is bounded (`$lib/stratify/revision-policy.js`): a person's quick
 * successive edits fold into their newest entry, and the same transaction
 * deletes revisions beyond the per-chart limit.
 */

import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { encodeChartFields, getChartField, isSameFieldValue } from '$lib/stratify/chart-fields.js';
import {
	RECENT_HISTORY_QUERY,
	REVISION_TYPE,
	buildBaselineRevision,
	buildRevision,
	canMergeInto,
	findRevisionsAfter,
	getRevisionVersion,
	mergeChanges,
	parseChanges,
	revisionKind,
	revisionsToPrune,
	summariseRevision
} from './revisions.js';

/** Attempts before a save that keeps losing `ifRevisionId` races gives up. */
const MAX_ATTEMPTS = 3;

/**
 * Pause before retrying a lost race, growing per attempt. GROQ reads are
 * eventually consistent, so the winning save may take a moment to show.
 */
const RETRY_DELAY_MS = 150;

/** The chart, and its newest revisions (enough to merge into and prune). */
const CHART_QUERY = `{
	"chart": *[_type == "stratifyChart" && _id == $id][0],
	"history": ${RECENT_HISTORY_QUERY}
}`;

/**
 * @typedef {Object} FieldConflict
 * @property {string} field
 * @property {{ userEmail: string | null, createdAt: string } | null} changedBy - Latest other save that touched the field, when the log knows it
 */

/**
 * @typedef {{ outcome: 'not-found' }
 *   | { outcome: 'unchanged', rev: string }
 *   | { outcome: 'saved', rev: string, chart: Record<string, any>, merged: boolean }
 *   | { outcome: 'conflict', conflicts: FieldConflict[], latest: Record<string, any> }
 * } SaveResult
 * `chart` is the decoded chart after the save; `merged` is true when the
 * save landed on saves the editor had not seen. On conflict, `latest` is the
 * current chart, so the editor can rebase.
 */

/**
 * @param {unknown} error
 */
function isRevisionMismatch(error) {
	return /** @type {{ statusCode?: number }} */ (error)?.statusCode === 409;
}

/**
 * Find incoming fields that saves after `baseRev` also changed and that
 * now hold a different value. When `baseRev` is unknown to the log, any
 * incoming field that differs from the stored value counts.
 * @param {import('@sanity/client').SanityClient} client
 * @param {Record<string, any>} current - Decoded current chart
 * @param {string} baseRev
 * @param {Record<string, any>} values
 * @returns {Promise<FieldConflict[]>}
 */
async function findConflicts(client, current, baseRev, values) {
	const later = await findRevisionsAfter(client, current._id, baseRev);

	/** @type {Map<string, FieldConflict['changedBy']>} */
	const touched = new Map();
	for (const revision of later ?? []) {
		for (const field of revision.fields ?? []) {
			touched.set(field, { userEmail: revision.userEmail, createdAt: revision.createdAt });
		}
	}

	return Object.keys(values)
		.filter(
			(field) =>
				(later === null || touched.has(field)) && !isSameFieldValue(current[field], values[field])
		)
		.map((field) => ({ field, changedBy: touched.get(field) ?? null }));
}

/**
 * Save changed chart fields, logging a revision.
 * @param {import('@sanity/client').SanityClient} client
 * @param {{
 *   id: string,
 *   baseRev: string | null,
 *   values: Record<string, any>,
 *   author: import('./revisions.js').RevisionAuthor,
 *   restoredFrom?: import('./revisions.js').RestoredFrom
 * }} input
 * `baseRev` null skips conflict checks (the pre-revision whole-snapshot
 * PATCH, kept for editors opened before this protocol shipped). `values`
 * must hold registry keys only. `restoredFrom` logs the save as a restore.
 * @returns {Promise<SaveResult>}
 */
export async function saveChartFields(client, { id, baseRev, values, author, restoredFrom }) {
	for (let attempt = 1; ; attempt++) {
		const { chart, history = [] } = await client.fetch(CHART_QUERY, { id, type: REVISION_TYPE });
		if (!chart) return { outcome: 'not-found' };

		const current = decodeChartFields(chart);
		const behind = baseRev !== null && baseRev !== chart._rev;

		if (behind) {
			const conflicts = await findConflicts(client, current, baseRev, values);
			if (conflicts.length > 0) return { outcome: 'conflict', conflicts, latest: current };
		}

		const changes = Object.keys(values)
			.filter((field) => !isSameFieldValue(current[field], values[field]))
			.map((field) => ({ field, before: current[field], after: values[field] }));
		if (changes.length === 0) return { outcome: 'unchanged', rev: chart._rev };

		const changed = Object.fromEntries(changes.map(({ field, after }) => [field, after]));
		const kind = restoredFrom ? 'restore' : revisionKind(values, chart.status);
		const now = new Date();
		const latest = history[0] ?? null;
		const mergeInto = canMergeInto(latest, kind, author, now) ? latest : null;

		const transaction = client.transaction();
		if (!latest) transaction.create(buildBaselineRevision(chart));
		transaction.patch(client.patch(id).ifRevisionId(chart._rev).set(encodeChartFields(changed)));

		if (mergeInto) {
			const earlier = parseChanges(
				await client.fetch(`*[_id == $revisionId][0].changes`, { revisionId: mergeInto._id })
			);
			const merged = mergeChanges(earlier, changes);
			if (merged.length === 0) {
				// The person undid their own edits: the entry has nothing left to say.
				transaction.delete(mergeInto._id);
			} else {
				const fields = merged.map((change) => change.field);
				transaction.patch(
					client
						.patch(mergeInto._id)
						.ifRevisionId(mergeInto._rev)
						.set({
							fields,
							changes: JSON.stringify(merged),
							summary: summariseRevision('edit', fields),
							updatedAt: now.toISOString()
						})
				);
			}
		} else {
			transaction.create(
				buildRevision({
					chartId: id,
					parentRev: chart._rev,
					kind,
					changes,
					author,
					createdAt: now.toISOString(),
					restoredFrom
				})
			);
		}

		for (const revisionId of revisionsToPrune(history, !mergeInto)) {
			transaction.delete(revisionId);
		}

		/** @type {Array<{ _id: string, _rev: string }>} */
		let documents;
		try {
			documents = await transaction.commit({ returnDocuments: true });
		} catch (error) {
			if (!isRevisionMismatch(error) || attempt >= MAX_ATTEMPTS) throw error;
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
			continue;
		}

		const rev = /** @type {{ _rev: string }} */ (documents.find((doc) => doc._id === id))._rev;
		return {
			outcome: 'saved',
			rev,
			chart: { ...current, ...changed, _rev: rev },
			merged: behind
		};
	}
}

/**
 * Pick the registry fields from a PATCH body's values, dropping the rest.
 * @param {Record<string, any>} values
 * @returns {Record<string, any>}
 */
export function pickChartFields(values) {
	return Object.fromEntries(
		Object.entries(values).filter(([key, value]) => getChartField(key) && value !== undefined)
	);
}

/**
 * Restore a chart's settings to how they were right after a revision,
 * logged as a `restore` revision. Publish state is left as it is.
 * @param {import('@sanity/client').SanityClient} client
 * @param {{
 *   chart: Record<string, any>,
 *   revisionId: string,
 *   author: import('./revisions.js').RevisionAuthor
 * }} input - `chart` is the raw current chart document
 * @returns {Promise<SaveResult>}
 */
export async function restoreChartVersion(client, { chart, revisionId, author }) {
	const version = await getRevisionVersion(client, decodeChartFields(chart), revisionId);
	if (!version) return { outcome: 'not-found' };

	return saveChartFields(client, {
		id: chart._id,
		baseRev: chart._rev,
		values: version.restore,
		author,
		restoredFrom: { revisionId, createdAt: version.revision.createdAt }
	});
}
