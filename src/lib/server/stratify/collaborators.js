/**
 * Sharing a Stratify chart with other admins.
 *
 * Collaborators live on the chart as a native array (so GROQ can find
 * "shared with me" charts): `[{ _key, userId, email, role, addedAt,
 * addedBy }]`, with `_key` = `userId`. Each change patches the chart and
 * logs a `collaborator` revision in one transaction, so editors' saves see
 * it in the revision log and merge cleanly past it.
 */

import {
	RECENT_HISTORY_QUERY,
	REVISION_TYPE,
	buildBaselineRevision,
	buildRevision,
	revisionsToPrune
} from './revisions.js';

/** Upper bound on collaborators per chart, keeping chart documents small. */
export const MAX_COLLABORATORS = 20;

/** Attempts before a change that keeps losing `ifRevisionId` races gives up. */
const MAX_ATTEMPTS = 3;

/**
 * @typedef {Object} Collaborator
 * @property {string} _key
 * @property {string} userId
 * @property {string} email
 * @property {import('$lib/stratify/chart-permissions.js').CollaboratorRole} role
 * @property {string} addedAt
 * @property {string | null} addedBy
 */

/**
 * @typedef {{ next: Collaborator[], summary: string } | { error: string } | null} CollaboratorChange
 * A new list and its history summary, an error to report, or null when
 * nothing changes.
 */

/**
 * Add a collaborator, or change their role if already added.
 * @param {Collaborator[]} list
 * @param {{ userId: string, email: string, role: Collaborator['role'], addedBy: string | null, now: Date }} person
 * @returns {CollaboratorChange}
 */
export function addCollaborator(list, { userId, email, role, addedBy, now }) {
	if (list.some((entry) => entry.userId === userId)) return setCollaboratorRole(list, userId, role);
	if (list.length >= MAX_COLLABORATORS) {
		return { error: `A chart can be shared with at most ${MAX_COLLABORATORS} people` };
	}
	return {
		next: [...list, { _key: userId, userId, email, role, addedAt: now.toISOString(), addedBy }],
		summary: `Shared with ${email} as ${role}`
	};
}

/**
 * @param {Collaborator[]} list
 * @param {string} userId
 * @param {Collaborator['role']} role
 * @returns {CollaboratorChange}
 */
export function setCollaboratorRole(list, userId, role) {
	const entry = list.find((item) => item.userId === userId);
	if (!entry) return { error: 'Not a collaborator on this chart' };
	if (entry.role === role) return null;
	return {
		next: list.map((item) => (item.userId === userId ? { ...item, role } : item)),
		summary: `Made ${entry.email} ${role === 'editor' ? 'an editor' : 'a viewer'}`
	};
}

/**
 * @param {Collaborator[]} list
 * @param {string} userId
 * @returns {CollaboratorChange}
 */
export function removeCollaborator(list, userId) {
	const entry = list.find((item) => item.userId === userId);
	if (!entry) return null;
	return {
		next: list.filter((item) => item.userId !== userId),
		summary: `Stopped sharing with ${entry.email}`
	};
}

const SHARING_QUERY = `{
	"chart": *[_type == "stratifyChart" && _id == $id][0] {
		_id, _rev, _createdAt, _updatedAt, userId, userEmail, collaborators
	},
	"history": ${RECENT_HISTORY_QUERY}
}`;

/**
 * Apply a sharing change to a chart, logged as a `collaborator` revision.
 * `change` receives the current list (retried against a fresher chart if
 * another save lands first).
 * @param {import('@sanity/client').SanityClient} client
 * @param {{
 *   id: string,
 *   change: (list: Collaborator[]) => CollaboratorChange,
 *   author: import('./revisions.js').RevisionAuthor
 * }} input
 * @returns {Promise<
 *   | { outcome: 'not-found' }
 *   | { outcome: 'invalid', error: string }
 *   | { outcome: 'unchanged', collaborators: Collaborator[], rev: string }
 *   | { outcome: 'saved', collaborators: Collaborator[], rev: string, parentRev: string }
 * >}
 */
export async function updateCollaborators(client, { id, change, author }) {
	for (let attempt = 1; ; attempt++) {
		const { chart, history = [] } = await client.fetch(SHARING_QUERY, { id, type: REVISION_TYPE });
		if (!chart) return { outcome: 'not-found' };

		/** @type {Collaborator[]} */
		const current = chart.collaborators ?? [];
		const result = change(current);
		if (result === null) return { outcome: 'unchanged', collaborators: current, rev: chart._rev };
		if ('error' in result) return { outcome: 'invalid', error: result.error };

		const transaction = client.transaction();
		if (history.length === 0) transaction.create(buildBaselineRevision(chart));
		transaction
			.patch(client.patch(id).ifRevisionId(chart._rev).set({ collaborators: result.next }))
			.create(
				buildRevision({
					chartId: id,
					parentRev: chart._rev,
					kind: 'collaborator',
					changes: [],
					author,
					createdAt: new Date().toISOString(),
					summary: result.summary
				})
			);
		for (const revisionId of revisionsToPrune(history, true)) transaction.delete(revisionId);

		/** @type {Array<{ _id: string, _rev: string }>} */
		let documents;
		try {
			documents = await transaction.commit({ returnDocuments: true });
		} catch (error) {
			const mismatch = /** @type {{ statusCode?: number }} */ (error)?.statusCode === 409;
			if (!mismatch || attempt >= MAX_ATTEMPTS) throw error;
			continue;
		}

		const rev = /** @type {{ _rev: string }} */ (documents.find((doc) => doc._id === id))._rev;
		return { outcome: 'saved', collaborators: result.next, rev, parentRev: chart._rev };
	}
}
