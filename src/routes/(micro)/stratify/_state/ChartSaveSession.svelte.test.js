import { describe, expect, test, vi } from 'vitest';
import { flushSync } from 'svelte';
import StratifyPlotProject from './StratifyPlotProject.svelte.js';
import ChartSaveSession from './ChartSaveSession.svelte.js';
import { ApiError } from '../_utils/api.js';

const CSV = 'date,solar\n2024-01-01,100\n2024-02-01,120';

/**
 * `test` whose body runs inside an effect root (the project's constructor
 * registers effects). Async bodies keep the root until they settle.
 * @param {string} name
 * @param {() => Promise<void>} body
 */
function it(name, body) {
	test(name, async () => {
		/** @type {Promise<void>} */
		let run = Promise.resolve();
		const stop = $effect.root(() => {
			run = body();
		});
		try {
			await run;
		} finally {
			stop();
		}
	});
}

/** @typedef {(...args: any[]) => Promise<any>} ApiCall */

function createApi() {
	return {
		createChart: vi.fn(/** @type {ApiCall} */ (async () => ({ _id: 'chart-1', _rev: 'rev-1' }))),
		updateChart: vi.fn(
			/** @type {ApiCall} */ (
				async () => ({ chart: { _id: 'chart-1', _rev: 'rev-2' }, latest: null })
			)
		),
		restoreRevision: vi.fn(/** @type {ApiCall} */ (async () => ({}))),
		addCollaborator: vi.fn(
			/** @type {ApiCall} */ (
				async () => ({
					collaborators: [{ userId: 'u1', email: 'u1@example.com', role: 'editor' }],
					chart: { _id: 'chart-1', _rev: 'rev-shared' },
					parentRev: 'rev-1'
				})
			)
		),
		setCollaboratorRole: vi.fn(/** @type {ApiCall} */ (async () => ({}))),
		removeCollaborator: vi.fn(/** @type {ApiCall} */ (async () => ({})))
	};
}

/**
 * A project loaded from a saved chart at `rev-1`.
 * @param {ReturnType<typeof createApi>} api
 */
function loadedSession(api) {
	const project = new StratifyPlotProject();
	project.loadFromSnapshot({ csvText: CSV, title: 'Generation', chartHeight: 250 });
	project.currentChartId = 'chart-1';
	flushSync();
	const session = new ChartSaveSession(project, /** @type {any} */ (api));
	session.markLoaded('rev-1');
	return { project, session };
}

/**
 * The server chart as GET would return it.
 * @param {Record<string, any>} overrides
 */
function serverChart(overrides) {
	return {
		_id: 'chart-1',
		status: 'draft',
		csvText: CSV,
		title: 'Generation',
		chartHeight: 250,
		...overrides
	};
}

describe('ChartSaveSession', () => {
	it('creates a new chart and takes it as the base', async () => {
		const api = createApi();
		const project = new StratifyPlotProject();
		project.loadFromSnapshot({ csvText: CSV });
		flushSync();
		const session = new ChartSaveSession(project, /** @type {any} */ (api));
		session.markLoaded(null);

		expect(await session.save()).toBe(true);
		expect(project.currentChartId).toBe('chart-1');
		expect(api.createChart).toHaveBeenCalledOnce();
		expect(api.updateChart).not.toHaveBeenCalled();
		expect(session.isDirty).toBe(false);
	});

	it('sends only changed fields with the base revision', async () => {
		const api = createApi();
		const { project, session } = loadedSession(api);

		project.title = 'Generation mix';
		flushSync();
		expect(session.isDirty).toBe(true);

		expect(await session.save()).toBe(true);
		expect(api.updateChart).toHaveBeenCalledWith('chart-1', {
			baseRev: 'rev-1',
			fields: { title: 'Generation mix' }
		});
		expect(session.isDirty).toBe(false);

		project.notes = 'Source: OE';
		await session.save();
		expect(api.updateChart).toHaveBeenLastCalledWith('chart-1', {
			baseRev: 'rev-2',
			fields: { notes: 'Source: OE' }
		});
	});

	it('skips the request when nothing changed', async () => {
		const api = createApi();
		const { session } = loadedSession(api);

		expect(await session.save()).toBe(true);
		expect(api.updateChart).not.toHaveBeenCalled();
	});

	it('pulls in fields others saved when the server merged the save', async () => {
		const api = createApi();
		api.updateChart.mockResolvedValueOnce({
			chart: { _id: 'chart-1', _rev: 'rev-3' },
			latest: serverChart({ _rev: 'rev-3', title: 'Mine', chartHeight: 400 })
		});
		const { project, session } = loadedSession(api);

		project.title = 'Mine';
		expect(await session.save()).toBe(true);

		expect(project.chartHeight).toBe(400);
		expect(session.isDirty).toBe(false);

		project.notes = 'Later';
		await session.save();
		expect(api.updateChart).toHaveBeenLastCalledWith('chart-1', {
			baseRev: 'rev-3',
			fields: { notes: 'Later' }
		});
	});

	it('opens a conflict for fields both sides changed and leaves the editor as is', async () => {
		const api = createApi();
		const changedBy = { userEmail: 'c@example.com', createdAt: '2026-10-06T00:00:00Z' };
		api.updateChart.mockRejectedValueOnce(
			new ApiError('Conflict', 409, {
				conflicts: [{ field: 'title', changedBy }],
				chart: serverChart({ _rev: 'rev-3', title: 'Theirs', chartHeight: 400 })
			})
		);
		const { project, session } = loadedSession(api);

		project.title = 'Mine';
		expect(await session.save()).toBe(false);

		expect(session.conflict?.fields).toEqual([
			{ field: 'title', label: 'Title', mine: 'Mine', theirs: 'Theirs', changedBy }
		]);
		expect(project.title).toBe('Mine');
		expect(project.chartHeight).toBe(250);
		expect(session.status).toBe('idle');
	});

	it('resolves a conflict with their value and saves against their revision', async () => {
		const api = createApi();
		api.updateChart.mockRejectedValueOnce(
			new ApiError('Conflict', 409, {
				conflicts: [{ field: 'title', changedBy: null }],
				chart: serverChart({ _rev: 'rev-3', title: 'Theirs', chartHeight: 400 })
			})
		);
		const { project, session } = loadedSession(api);

		project.title = 'Mine';
		project.notes = 'Mine too';
		await session.save();

		expect(await session.resolveConflict({ title: 'theirs' })).toBe(true);
		expect(project.title).toBe('Theirs');
		expect(project.chartHeight).toBe(400);
		expect(session.conflict).toBeNull();
		expect(api.updateChart).toHaveBeenLastCalledWith('chart-1', {
			baseRev: 'rev-3',
			fields: { notes: 'Mine too' }
		});
	});

	it('rebases and retries when the server conflict has no real overlap', async () => {
		const api = createApi();
		api.updateChart.mockRejectedValueOnce(
			new ApiError('Conflict', 409, {
				conflicts: [{ field: 'title', changedBy: null }],
				chart: serverChart({ _rev: 'rev-3', chartHeight: 400 })
			})
		);
		const { project, session } = loadedSession(api);

		project.title = 'Mine';
		expect(await session.save()).toBe(true);

		expect(project.chartHeight).toBe(400);
		expect(api.updateChart).toHaveBeenLastCalledWith('chart-1', {
			baseRev: 'rev-3',
			fields: { title: 'Mine' }
		});
	});

	it('publishes with pending edits and follows the new status', async () => {
		const api = createApi();
		const { project, session } = loadedSession(api);

		project.title = 'Final';
		expect(await session.publish()).toBe(true);

		const [, save] = api.updateChart.mock.lastCall ?? [];
		expect(save.fields).toMatchObject({ title: 'Final', status: 'published' });
		expect(typeof save.fields.publishedAt).toBe('string');
		expect(project.status).toBe('published');
	});

	it('saves a single field and keeps other edits unsaved', async () => {
		const api = createApi();
		const { project, session } = loadedSession(api);

		project.title = 'Unsaved';
		project.showBranding = false;
		await session.saveField('showBranding');

		expect(api.updateChart).toHaveBeenCalledWith('chart-1', {
			baseRev: 'rev-1',
			fields: { showBranding: false }
		});
		expect(session.isDirty).toBe(true);
	});

	it('reports other failures as an error', async () => {
		const api = createApi();
		api.updateChart.mockRejectedValueOnce(new Error('Network down'));
		const { project, session } = loadedSession(api);

		project.title = 'Mine';
		expect(await session.save()).toBe(false);
		expect(session.status).toBe('error');
		expect(session.errorMessage).toBe('Network down');
		expect(session.isDirty).toBe(true);
	});

	it('restores a version, replacing unsaved edits and taking it as the base', async () => {
		const api = createApi();
		api.restoreRevision.mockResolvedValueOnce({
			chart: { _id: 'chart-1', _rev: 'rev-5' },
			latest: serverChart({ _rev: 'rev-5', title: 'Old title', status: 'published' })
		});
		const { project, session } = loadedSession(api);

		project.title = 'Unsaved';
		expect(await session.restore('revision-1')).toBe(true);

		expect(api.restoreRevision).toHaveBeenCalledWith('chart-1', 'revision-1');
		expect(project.title).toBe('Old title');
		expect(project.status).toBe('published');
		expect(session.rev).toBe('rev-5');
		expect(session.isDirty).toBe(false);
	});
});

describe('ChartSaveSession permissions and sharing', () => {
	it('keeps a viewer read-only: nothing is dirty and nothing saves', async () => {
		const api = createApi();
		const { project, session } = loadedSession(api);
		session.markLoaded('rev-1', { access: 'viewer' });

		project.title = 'Changed';
		flushSync();

		expect(session.isDirty).toBe(false);
		expect(await session.save()).toBe(false);
		expect(api.updateChart).not.toHaveBeenCalled();
	});

	it('lets an editor save but not publish', async () => {
		const api = createApi();
		const { project, session } = loadedSession(api);
		session.markLoaded('rev-1', { access: 'editor' });

		project.title = 'Changed';
		expect(await session.publish()).toBe(false);
		expect(api.updateChart).not.toHaveBeenCalled();
		expect(await session.save()).toBe(true);
	});

	it('moves the base revision forward past its own sharing change', async () => {
		const api = createApi();
		const { project, session } = loadedSession(api);

		expect(await session.share('u1@example.com', 'editor')).toBeNull();
		expect(session.collaborators).toHaveLength(1);
		expect(session.rev).toBe('rev-shared');

		project.title = 'After sharing';
		await session.save();
		expect(api.updateChart).toHaveBeenLastCalledWith('chart-1', {
			baseRev: 'rev-shared',
			fields: { title: 'After sharing' }
		});
	});

	it('leaves the base alone when others saved before the sharing change', async () => {
		const api = createApi();
		api.addCollaborator.mockResolvedValueOnce({
			collaborators: [],
			chart: { _id: 'chart-1', _rev: 'rev-9' },
			parentRev: 'rev-8'
		});
		const { session } = loadedSession(api);

		await session.share('u1@example.com', 'viewer');

		expect(session.rev).toBe('rev-1');
	});

	it('reports sharing errors and refuses non-owners', async () => {
		const api = createApi();
		api.addCollaborator.mockRejectedValueOnce(
			new Error('No Stratify admin uses that email address')
		);
		const { session } = loadedSession(api);

		expect(await session.share('x@example.com', 'viewer')).toBe(
			'No Stratify admin uses that email address'
		);

		session.markLoaded('rev-1', { access: 'editor' });
		expect(await session.share('x@example.com', 'viewer')).toBe(
			'Only the owner can share this chart'
		);
	});
});
