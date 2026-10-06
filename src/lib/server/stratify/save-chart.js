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
 */

import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { encodeChartFields, getChartField, isSameFieldValue } from '$lib/stratify/chart-fields.js';
import {
	REVISION_TYPE,
	buildBaselineRevision,
	buildRevision,
	findRevisionsAfter,
	revisionKind
} from './revisions.js';

/** Attempts before a save that keeps losing `ifRevisionId` races gives up. */
const MAX_ATTEMPTS = 3;

/**
 * Pause before retrying a lost race, growing per attempt. GROQ reads are
 * eventually consistent, so the winning save may take a moment to show.
 */
const RETRY_DELAY_MS = 150;

const CHART_QUERY = `{
	"chart": *[_type == "stratifyChart" && _id == $id][0],
	"hasHistory": defined(*[_type == $type && chartId == $id][0]._id)
}`;

/**
 * @typedef {Object} FieldConflict
 * @property {string} field
 * @property {{ userEmail: string | null, createdAt: string } | null} changedBy - Latest other save that touched the field, when the log knows it
 */

/**
 * @typedef {{ outcome: 'not-found' }
 *   | { outcome: 'unchanged', rev: string }
 *   | { outcome: 'saved', rev: string, latest: Record<string, any> | null }
 *   | { outcome: 'conflict', conflicts: FieldConflict[], latest: Record<string, any> }
 * } SaveResult
 * `latest` is the decoded chart after the save when it merged with saves the
 * editor had not seen (null when the editor was up to date), or the current
 * chart on conflict, so the editor can rebase either way.
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
 *   author: import('./revisions.js').RevisionAuthor
 * }} input
 * `baseRev` null skips conflict checks (the pre-revision whole-snapshot
 * PATCH, kept for editors opened before this protocol shipped). `values`
 * must hold registry keys only.
 * @returns {Promise<SaveResult>}
 */
export async function saveChartFields(client, { id, baseRev, values, author }) {
	for (let attempt = 1; ; attempt++) {
		const { chart, hasHistory } = await client.fetch(CHART_QUERY, { id, type: REVISION_TYPE });
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
		const transaction = client.transaction();
		if (!hasHistory) transaction.create(buildBaselineRevision(chart));
		transaction
			.patch(client.patch(id).ifRevisionId(chart._rev).set(encodeChartFields(changed)))
			.create(
				buildRevision({
					chartId: id,
					parentRev: chart._rev,
					kind: revisionKind(values, chart.status),
					changes,
					author,
					createdAt: new Date().toISOString()
				})
			);

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
			latest: behind ? { ...current, ...changed, _rev: rev } : null
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
