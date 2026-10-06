/**
 * Saving a builder project to Sanity without overwriting anyone else.
 *
 * The session remembers the base: the chart as last loaded from or saved to
 * the server, and its `_rev`. A save sends only the fields changed since the
 * base, with the base `_rev`. When the server reports that others saved in
 * the meantime, their changes are folded into the editor: fields only they
 * changed update in place, and fields both sides changed become a
 * `conflict` for the user to resolve. See `PATCH /api/stratify/charts/:id`.
 *
 * Shared through context so the header actions and the Share panel use the
 * same base, status and conflict.
 */

import { diffSnapshots, getChartField, mergeFields } from '$lib/stratify/chart-fields.js';
import { normaliseSnapshot } from './snapshot.js';
import { ApiError, createChart, restoreRevision, updateChart } from '../_utils/api.js';

/** Saves that keep finding fresh-but-compatible server changes give up after this. */
const MAX_REBASES = 2;

/**
 * @typedef {Object} SaveConflictField
 * @property {string} field
 * @property {string} label
 * @property {any} mine
 * @property {any} theirs
 * @property {{ userEmail: string | null, createdAt: string } | null} changedBy
 */

/**
 * @typedef {Object} SaveConflict
 * @property {SaveConflictField[]} fields - Fields both sides changed differently
 * @property {Record<string, any>} merged - My snapshot plus their non-overlapping changes
 * @property {Record<string, any>} theirs - The server chart, normalised
 * @property {string} rev - The server chart's `_rev`
 * @property {Record<string, any>} pending - Publish fields to resend once resolved
 */

/**
 * @typedef {Object} SaveApi
 * @property {typeof createChart} createChart
 * @property {typeof updateChart} updateChart
 * @property {typeof restoreRevision} restoreRevision
 */

/**
 * @param {Record<string, any>} values
 * @param {string[]} keys
 */
function pick(values, keys) {
	return Object.fromEntries(keys.map((key) => [key, values[key]]));
}

export default class ChartSaveSession {
	/** @type {import('./StratifyPlotProject.svelte.js').default} */
	#project;

	/** @type {SaveApi} */
	#api;

	/** @type {{ snapshot: Record<string, any>, rev: string | null } | null} */
	#base = $state.raw(null);

	/** @type {'idle' | 'saving' | 'saved' | 'error'} */
	status = $state('idle');

	/** @type {'save' | 'publish' | 'unpublish' | 'restore' | null} The action in flight */
	action = $state(null);

	/** @type {string | null} */
	errorMessage = $state(null);

	/** @type {SaveConflict | null} */
	conflict = $state.raw(null);

	/** Whether the project differs from the base. */
	isDirty = $derived.by(() => {
		const base = this.#base;
		return (
			this.#project.hasData &&
			base !== null &&
			diffSnapshots(base.snapshot, this.#project.toJSON()).length > 0
		);
	});

	/**
	 * @param {import('./StratifyPlotProject.svelte.js').default} project
	 * @param {SaveApi} [api]
	 */
	constructor(project, api = { createChart, updateChart, restoreRevision }) {
		this.#project = project;
		this.#api = api;
	}

	/** The server revision the editor is based on; changes with every save. */
	get rev() {
		return this.#base?.rev ?? null;
	}

	/**
	 * Take the project as just loaded (or freshly started) as the base.
	 * @param {string | null} rev - The loaded chart's `_rev`; null when unsaved
	 */
	markLoaded(rev) {
		this.#base = { snapshot: this.#current(), rev };
		this.conflict = null;
	}

	/** Treat the current edits as saved without saving (discard before leaving). */
	markSaved() {
		this.#base = { snapshot: this.#current(), rev: this.#base?.rev ?? null };
	}

	/** Save every change. */
	save() {
		return this.#run('save', {});
	}

	/**
	 * Save one field on its own, leaving other edits unsaved.
	 * @param {string} key
	 */
	saveField(key) {
		return this.#run('save', {}, [key]);
	}

	/** Save every change and publish. */
	publish() {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a timestamp string, not state
		const publishedAt = new Date().toISOString();
		return this.#run('publish', { status: 'published', publishedAt });
	}

	/** Save every change and return the chart to draft. */
	unpublish() {
		return this.#run('unpublish', { status: 'draft', publishedAt: null });
	}

	/**
	 * Apply the user's choice for each conflicting field (default: mine),
	 * adopt the server chart as the base and save again.
	 * @param {Record<string, 'mine' | 'theirs'>} choices
	 */
	async resolveConflict(choices) {
		const conflict = this.conflict;
		if (!conflict) return false;

		const resolved = { ...conflict.merged };
		for (const { field, theirs } of conflict.fields) {
			if (choices[field] === 'theirs') resolved[field] = theirs;
		}
		this.#adopt(resolved, conflict.theirs, conflict.rev);
		this.conflict = null;

		const { status } = conflict.pending;
		const action = status === 'published' ? 'publish' : status === 'draft' ? 'unpublish' : 'save';
		return this.#run(action, conflict.pending);
	}

	/**
	 * Restore the chart's settings to a past version (logged on the server
	 * as a new revision) and load the result, replacing unsaved edits.
	 * @param {string} revisionId
	 * @returns {Promise<boolean>}
	 */
	async restore(revisionId) {
		const id = this.#project.currentChartId;
		if (!id || this.action) return false;
		this.action = 'restore';
		this.errorMessage = null;
		try {
			const { latest } = await this.#api.restoreRevision(id, revisionId);
			this.#project.loadFromSnapshot(latest);
			this.markLoaded(latest._rev);
			return true;
		} catch (error) {
			this.errorMessage = error instanceof Error ? error.message : 'Restore failed';
			return false;
		} finally {
			this.action = null;
		}
	}

	/** Close the conflict prompt; the edits stay unsaved. */
	dismissConflict() {
		this.conflict = null;
	}

	/** @returns {Record<string, any>} */
	#current() {
		return $state.snapshot(this.#project.toJSON());
	}

	/**
	 * @param {'save' | 'publish' | 'unpublish'} action
	 * @param {Record<string, any>} publishFields
	 * @param {string[] | null} [only] - Limit the save to these fields
	 * @returns {Promise<boolean>}
	 */
	async #run(action, publishFields, only = null) {
		if (!this.#project.hasData || this.action) return false;
		this.action = action;
		this.status = 'saving';
		this.errorMessage = null;
		try {
			if (!this.#project.currentChartId) await this.#create();
			const saved = await this.#saveChanges(publishFields, only);
			this.#settle(saved ? 'saved' : 'idle');
			return saved;
		} catch (error) {
			this.errorMessage = error instanceof Error ? error.message : 'Save failed';
			this.#settle('error');
			return false;
		} finally {
			this.action = null;
		}
	}

	async #create() {
		const sent = this.#current();
		const created = await this.#api.createChart(/** @type {any} */ (sent));
		this.#project.currentChartId = created._id;
		this.#project.status = 'draft';
		this.#base = { snapshot: sent, rev: created._rev };
	}

	/**
	 * @param {Record<string, any>} publishFields
	 * @param {string[] | null} only
	 * @returns {Promise<boolean>} false when the user must resolve a conflict
	 */
	async #saveChanges(publishFields, only) {
		const id = /** @type {string} */ (this.#project.currentChartId);

		for (let rebases = 0; ; rebases++) {
			const base = /** @type {{ snapshot: Record<string, any>, rev: string | null }} */ (
				this.#base
			);
			const sent = this.#current();
			const changed = diffSnapshots(base.snapshot, sent)
				.map((change) => change.field)
				.filter((field) => !only || only.includes(field));
			const fields = { ...pick(sent, changed), ...publishFields };
			if (Object.keys(fields).length === 0) return true;

			try {
				const { chart, latest } = await this.#api.updateChart(id, {
					baseRev: /** @type {string} */ (base.rev),
					fields
				});
				const savedBase = { ...base.snapshot, ...fields };
				if (latest) return this.#reconcile(latest, savedBase, {});

				this.#base = { snapshot: savedBase, rev: chart._rev };
				if (publishFields.status) this.#project.status = publishFields.status;
				return true;
			} catch (error) {
				const isConflict = error instanceof ApiError && error.status === 409;
				if (!isConflict) throw error;

				/** @type {Array<{ field: string, changedBy: SaveConflictField['changedBy'] }>} */
				const serverConflicts = error.body.conflicts ?? [];
				const changedBy = Object.fromEntries(serverConflicts.map((c) => [c.field, c.changedBy]));
				const merged = this.#reconcile(error.body.chart, base.snapshot, publishFields, changedBy);
				if (!merged || rebases >= MAX_REBASES) return false;
			}
		}
	}

	/**
	 * Fold a newer server chart into the editor. Fields only the server
	 * changed are applied; if any field was changed on both sides, open a
	 * conflict instead and leave the editor untouched.
	 * @param {Record<string, any>} latest - Decoded server chart
	 * @param {Record<string, any>} base - What the editor believes the server held
	 * @param {Record<string, any>} pending - Publish fields to resend after a conflict
	 * @param {Record<string, SaveConflictField['changedBy']>} [changedBy] - Who last changed each field, by key
	 * @returns {boolean} true when merged without a conflict
	 */
	#reconcile(latest, base, pending, changedBy = {}) {
		const theirs = normaliseSnapshot(latest);
		const { merged, conflicts } = mergeFields(base, this.#current(), theirs);

		if (conflicts.length === 0) {
			this.#adopt(merged, theirs, latest._rev);
			return true;
		}

		this.conflict = {
			fields: conflicts.map(({ field, mine, theirs: theirValue }) => ({
				field,
				label: getChartField(field)?.label ?? field,
				mine,
				theirs: theirValue,
				changedBy: changedBy[field] ?? null
			})),
			merged,
			theirs,
			rev: latest._rev,
			pending
		};
		return false;
	}

	/**
	 * Set the editor to `values` (changing only what differs), take the
	 * server chart as the new base and follow its publish state.
	 * @param {Record<string, any>} values
	 * @param {Record<string, any>} theirs
	 * @param {string} rev
	 */
	#adopt(values, theirs, rev) {
		const project = /** @type {Record<string, any>} */ (/** @type {unknown} */ (this.#project));
		for (const { field, after } of diffSnapshots(this.#current(), values)) {
			project[field] = after;
		}
		this.#project.status = theirs.status;
		this.#base = { snapshot: theirs, rev };
	}

	/** @param {'idle' | 'saved' | 'error'} status */
	#settle(status) {
		this.status = status;
		if (status === 'idle') return;
		setTimeout(
			() => {
				if (this.status === status) this.status = 'idle';
			},
			status === 'saved' ? 2000 : 3000
		);
	}
}
