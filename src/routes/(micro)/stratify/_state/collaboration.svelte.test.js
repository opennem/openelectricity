/**
 * Multi-user Stratify editing, end to end below the browser: two builder
 * sessions (owner and editor) talk to the real server save, restore and
 * sharing code through an in-memory Sanity. Covers what the design note's
 * two-browser Playwright test would (merges, conflicts, pull-in, restore,
 * history limits, read-only viewers) without needing Clerk test accounts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import StratifyPlotProject from './StratifyPlotProject.svelte.js';
import ChartSaveSession from './ChartSaveSession.svelte.js';
import { ApiError } from '../_utils/api.js';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { encodeChartFields, withChartDefaults } from '$lib/stratify/chart-fields.js';
import { getChartAccess } from '$lib/server/stratify/chart-access.js';
import { REVISION_TYPE } from '$lib/server/stratify/revisions.js';
import { restoreChartVersion, saveChartFields } from '$lib/server/stratify/save-chart.js';
import { addCollaborator, updateCollaborators } from '$lib/server/stratify/collaborators.js';

const CSV = 'date,solar\n2024-01-01,100\n2024-02-01,120';

/**
 * In-memory Sanity for the queries the Stratify server modules make,
 * recognised by shape, and transactions with `ifRevisionId` checks.
 */
function createFakeSanity() {
	/** @type {Map<string, Record<string, any>>} */
	const docs = new Map();
	let ids = 0;

	const nextId = () => `doc-${++ids}`;
	/** Each write takes a second of (fake) time, so revisions order as they would live. */
	const tick = () => {
		vi.setSystemTime(Date.now() + 1000);
		return new Date().toISOString();
	};
	const revisions = (/** @type {string} */ chartId) =>
		[...docs.values()]
			.filter((doc) => doc._type === REVISION_TYPE && doc.chartId === chartId)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	/**
	 * @param {string} query
	 * @param {Record<string, any>} params
	 */
	async function fetch(query, params) {
		if (query.includes('"history"')) {
			const chart = docs.get(params.id) ?? null;
			return { chart: chart && structuredClone(chart), history: revisions(params.id) };
		}
		if (query.includes('"start"')) {
			const ordered = revisions(params.chartId).reverse();
			const start = ordered.find((doc) => doc.parentRev === params.rev)?.createdAt ?? null;
			return { start, revisions: start ? ordered.filter((doc) => doc.createdAt >= start) : [] };
		}
		if (query.includes('"newer"')) {
			const revision = docs.get(params.revisionId);
			if (!revision || revision.chartId !== params.chartId) return { revision: null, newer: [] };
			const newer = revisions(params.chartId).filter((doc) => doc.createdAt > revision.createdAt);
			return { revision: structuredClone(revision), newer };
		}
		if (query.includes('.changes')) return docs.get(params.revisionId)?.changes ?? null;
		throw new Error(`Fake Sanity: unrecognised query ${query}`);
	}

	/** @param {string} id */
	function patch(id) {
		/** @type {{ id: string, ifRevision: string | null, set: Record<string, any> }} */
		const op = { id, ifRevision: null, set: {} };
		const builder = {
			ifRevisionId: (/** @type {string} */ rev) => ((op.ifRevision = rev), builder),
			set: (/** @type {Record<string, any>} */ values) => ((op.set = values), builder),
			op
		};
		return builder;
	}

	function transaction() {
		/** @type {Array<{ create?: any, patch?: any, delete?: string }>} */
		const ops = [];
		const builder = {
			create: (/** @type {any} */ doc) => (ops.push({ create: doc }), builder),
			patch: (/** @type {any} */ p) => (ops.push({ patch: p.op }), builder),
			delete: (/** @type {string} */ id) => (ops.push({ delete: id }), builder),
			commit: async () => {
				for (const { patch: p } of ops) {
					if (p?.ifRevision && docs.get(p.id)?._rev !== p.ifRevision) {
						throw Object.assign(new Error('Revision mismatch'), { statusCode: 409 });
					}
				}
				const rev = `rev-${++ids}`;
				const now = tick();
				for (const op of ops) {
					if (op.create) {
						const id = op.create._id ?? nextId();
						docs.set(id, { ...op.create, _id: id, _rev: rev });
					}
					if (op.patch) {
						const doc = docs.get(op.patch.id);
						docs.set(op.patch.id, { ...doc, ...op.patch.set, _rev: rev, _updatedAt: now });
					}
					if (op.delete) docs.delete(op.delete);
				}
				return [...docs.values()];
			}
		};
		return builder;
	}

	/** Store a new chart, as POST /api/stratify/charts does. */
	function createChart(/** @type {Record<string, any>} */ snapshot, /** @type {string} */ ownerId) {
		const id = nextId();
		const rev = `rev-${++ids}`;
		docs.set(id, {
			_id: id,
			_type: 'stratifyChart',
			_rev: rev,
			_updatedAt: tick(),
			userId: ownerId,
			userEmail: `${ownerId}@example.com`,
			...encodeChartFields({ ...withChartDefaults(snapshot), status: 'draft', publishedAt: null })
		});
		return { _id: id, _rev: rev };
	}

	return {
		client: /** @type {any} */ ({ fetch, patch, transaction }),
		docs,
		revisions,
		createChart
	};
}

/**
 * The builder's API for one signed-in user, backed by the real server
 * modules (the routes' auth and body checks are covered by their own tests).
 * @param {ReturnType<typeof createFakeSanity>} sanity
 * @param {string} userId
 */
function apiFor(sanity, userId) {
	const author = { userId, userEmail: `${userId}@example.com` };
	const auth = { userId, isSuperAdmin: false };
	/**
	 * The chart and the user's access to it, or a 404 as the routes give.
	 * @param {string} id
	 * @returns {{ chart: Record<string, any>, access: import('$lib/stratify/chart-permissions.js').ChartAccess }}
	 */
	const accessTo = (id) => {
		const chart = sanity.docs.get(id);
		const access = chart ? getChartAccess(chart, auth) : null;
		if (!chart || !access) throw new ApiError('Not found', 404, {});
		return { chart, access };
	};

	return {
		createChart: async (/** @type {any} */ snapshot) => sanity.createChart(snapshot, userId),
		/** @returns {Promise<Record<string, any>>} */
		getChart: async (/** @type {string} */ id) => {
			const { chart, access } = accessTo(id);
			return { ...decodeChartFields(chart), access };
		},
		getChartHead: async (/** @type {string} */ id) => {
			accessTo(id);
			return { rev: sanity.docs.get(id)?._rev, latest: null };
		},
		updateChart: async (/** @type {string} */ id, /** @type {any} */ save) => {
			accessTo(id);
			const result = await saveChartFields(sanity.client, {
				id,
				baseRev: save.baseRev,
				values: save.fields,
				author
			});
			if (result.outcome === 'conflict') {
				throw new ApiError('Conflict', 409, { conflicts: result.conflicts, chart: result.latest });
			}
			if (result.outcome === 'not-found') throw new ApiError('Not found', 404, {});
			if (result.outcome === 'unchanged')
				return { chart: { _id: id, _rev: result.rev }, latest: null };
			return { chart: { _id: id, _rev: result.rev }, latest: result.merged ? result.chart : null };
		},
		restoreRevision: async (/** @type {string} */ id, /** @type {string} */ revisionId) => {
			const { chart } = accessTo(id);
			const result = await restoreChartVersion(sanity.client, { chart, revisionId, author });
			if (result.outcome !== 'saved') throw new ApiError('Restore failed', 400, {});
			return { chart: { _id: id, _rev: result.rev }, latest: result.chart };
		},
		addCollaborator: async () => ({}),
		setCollaboratorRole: async () => ({}),
		removeCollaborator: async () => ({})
	};
}

/**
 * Open a chart in a builder session as `userId`, as BuilderPage does.
 * @param {ReturnType<typeof createFakeSanity>} sanity
 * @param {string} userId
 * @param {string} chartId
 */
async function openBuilder(sanity, userId, chartId) {
	const api = apiFor(sanity, userId);
	const chart = await api.getChart(chartId);
	// Each builder hosts its project's effects in a root of its own, since it
	// is created after awaits; afterEach tears them down.
	/** @type {StratifyPlotProject} */
	let project = /** @type {any} */ (null);
	effectRoots.push(
		$effect.root(() => {
			project = new StratifyPlotProject();
		})
	);
	project.loadFromSnapshot(chart);
	project.currentChartId = chartId;
	flushSync();
	const session = new ChartSaveSession(project, /** @type {any} */ (api));
	session.markLoaded(chart._rev, { access: chart.access });
	return { project, session };
}

/**
 * A chart owned by `owner`, shared with `editor` (and optionally a viewer).
 * @param {{ viewer?: boolean }} [options]
 */
async function sharedChart({ viewer = false } = {}) {
	const sanity = createFakeSanity();
	const { _id: chartId } = sanity.createChart({ csvText: CSV, title: 'Generation' }, 'owner');
	for (const [userId, role] of [['editor', 'editor'], ...(viewer ? [['viewer', 'viewer']] : [])]) {
		await updateCollaborators(sanity.client, {
			id: chartId,
			change: (list) =>
				addCollaborator(list, {
					userId,
					email: `${userId}@example.com`,
					role: /** @type {'editor' | 'viewer'} */ (role),
					addedBy: 'owner',
					now: new Date()
				}),
			author: { userId: 'owner', userEmail: 'owner@example.com' }
		});
	}
	return { sanity, chartId };
}

/** @type {Array<() => void>} */
const effectRoots = [];

// Fake only Date, so the same-author merge window can be stepped past while
// timers (retry backoff, status resets) run normally.
beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-10-06T00:00:00.000Z'));
});

afterEach(() => {
	for (const stop of effectRoots.splice(0)) stop();
	vi.useRealTimers();
});

/** @param {number} minutes */
function advanceMinutes(minutes) {
	vi.setSystemTime(Date.now() + minutes * 60_000);
}

describe('Stratify collaboration across two builders', () => {
	it('pulls another person’s save into an untouched builder', async () => {
		const { sanity, chartId } = await sharedChart();
		const owner = await openBuilder(sanity, 'owner', chartId);
		const editor = await openBuilder(sanity, 'editor', chartId);

		owner.project.title = 'Generation mix';
		expect(await owner.session.save()).toBe(true);

		await editor.session.checkForChanges();
		expect(editor.project.title).toBe('Generation mix');
		expect(editor.session.isDirty).toBe(false);
	});

	it('merges saves to different settings, in both builders', async () => {
		const { sanity, chartId } = await sharedChart();
		const owner = await openBuilder(sanity, 'owner', chartId);
		const editor = await openBuilder(sanity, 'editor', chartId);

		owner.project.title = 'Owner title';
		editor.project.chartHeight = 400;
		expect(await owner.session.save()).toBe(true);
		expect(await editor.session.save()).toBe(true);

		// The editor's save returned the merged chart.
		expect(editor.project.title).toBe('Owner title');
		await owner.session.checkForChanges();
		expect(owner.project.chartHeight).toBe(400);

		const stored = decodeChartFields(/** @type {any} */ (sanity.docs.get(chartId)));
		expect(stored).toMatchObject({ title: 'Owner title', chartHeight: 400 });
	});

	it('asks the second saver to resolve a clash, and keeps their choice', async () => {
		const { sanity, chartId } = await sharedChart();
		const owner = await openBuilder(sanity, 'owner', chartId);
		const editor = await openBuilder(sanity, 'editor', chartId);

		owner.project.title = 'Owner title';
		editor.project.title = 'Editor title';
		editor.project.notes = 'Editor notes';
		await owner.session.save();
		expect(await editor.session.save()).toBe(false);

		expect(editor.session.conflict?.fields).toEqual([
			expect.objectContaining({ field: 'title', mine: 'Editor title', theirs: 'Owner title' })
		]);
		expect(await editor.session.resolveConflict({ title: 'mine' })).toBe(true);

		const stored = decodeChartFields(/** @type {any} */ (sanity.docs.get(chartId)));
		expect(stored).toMatchObject({ title: 'Editor title', notes: 'Editor notes' });
	});

	it('shows a pull-in banner instead of touching unsaved work', async () => {
		const { sanity, chartId } = await sharedChart();
		const owner = await openBuilder(sanity, 'owner', chartId);
		const editor = await openBuilder(sanity, 'editor', chartId);

		owner.project.chartHeight = 500;
		await owner.session.save();
		editor.project.notes = 'Draft notes';
		await editor.session.checkForChanges();

		expect(editor.session.remote).not.toBeNull();
		expect(editor.project.chartHeight).toBe(250);
		await editor.session.pullIn();
		expect(editor.project).toMatchObject({ chartHeight: 500, notes: 'Draft notes' });
	});

	it('restores an earlier version and logs it, for both builders', async () => {
		const { sanity, chartId } = await sharedChart();
		const owner = await openBuilder(sanity, 'owner', chartId);
		const editor = await openBuilder(sanity, 'editor', chartId);

		owner.project.title = 'Second';
		await owner.session.save();
		const [afterSecond] = sanity.revisions(chartId);
		advanceMinutes(15);
		owner.project.title = 'Third';
		await owner.session.save();

		expect(await editor.session.restore(afterSecond._id)).toBe(true);
		expect(editor.project.title).toBe('Second');
		expect(sanity.revisions(chartId)[0]).toMatchObject({ kind: 'restore' });

		await owner.session.checkForChanges();
		expect(owner.project.title).toBe('Second');
	});

	it("folds one person's quick saves into one history entry", async () => {
		const { sanity, chartId } = await sharedChart();
		const owner = await openBuilder(sanity, 'owner', chartId);
		const before = sanity.revisions(chartId).length;

		owner.project.title = 'One';
		await owner.session.save();
		owner.project.title = 'Two';
		await owner.session.save();
		owner.project.notes = 'Three';
		await owner.session.save();

		expect(sanity.revisions(chartId)).toHaveLength(before + 1);
		expect(sanity.revisions(chartId)[0]).toMatchObject({ fields: ['title', 'notes'] });
	});

	it('keeps a viewer read-only', async () => {
		const { sanity, chartId } = await sharedChart({ viewer: true });
		const viewer = await openBuilder(sanity, 'viewer', chartId);

		viewer.project.title = 'Sneaky';
		expect(viewer.session.isDirty).toBe(false);
		expect(await viewer.session.save()).toBe(false);
		expect(decodeChartFields(/** @type {any} */ (sanity.docs.get(chartId))).title).toBe(
			'Generation'
		);
	});
});
