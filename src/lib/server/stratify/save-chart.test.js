import { describe, expect, it, vi } from 'vitest';
import { pickChartFields, restoreChartVersion, saveChartFields } from './save-chart.js';

const AUTHOR = { userId: 'user-2', userEmail: 'b@example.com' };

/** @param {Record<string, any>} [overrides] */
function storedChart(overrides = {}) {
	return {
		_id: 'chart-1',
		_rev: 'rev-1',
		_updatedAt: '2026-10-01T00:00:00Z',
		userId: 'user-1',
		userEmail: 'a@example.com',
		status: 'draft',
		title: 'Generation',
		chartHeight: 250,
		userSeriesColours: '{"solar":"#ff0"}',
		...overrides
	};
}

/** The chart's baseline: older than the merge window and by its owner. */
const BASELINE_ENTRY = {
	_id: 'baseline-1',
	_rev: 'baseline-rev',
	kind: 'baseline',
	userId: 'user-1',
	createdAt: '2026-10-01T00:00:00.000Z'
};

/**
 * A history entry `minutesAgo` old.
 * @param {Record<string, any>} entry
 * @param {number} minutesAgo
 */
function entryAgo(entry, minutesAgo) {
	return { ...entry, createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString() };
}

/**
 * Minimal Sanity client: answers the chart, later-revisions and
 * entry-changes queries and records transactions. `history` is the chart's
 * revisions, newest first; `latestChanges` the JSON changes of the newest.
 * `commitErrors` are thrown by successive commits.
 * @param {{
 *   chart?: Record<string, any> | null,
 *   history?: Array<Record<string, any>>,
 *   latestChanges?: string,
 *   later?: Array<{ fields: string[], userEmail: string, createdAt: string }> | null,
 *   commitErrors?: unknown[]
 * }} [options]
 */
function createFakeClient({
	chart = storedChart(),
	history = [BASELINE_ENTRY],
	latestChanges = '[]',
	later = null,
	commitErrors = []
} = {}) {
	/** @type {Array<{ ops: any[], options: any }>} */
	const commits = [];

	const client = {
		fetch: vi.fn(async (/** @type {string} */ query) => {
			if (query.includes('"history"')) return { chart, history };
			if (query.includes('.changes')) return latestChanges;
			return { start: later ? '2026-10-02T00:00:00Z' : null, revisions: later ?? [] };
		}),
		patch: (/** @type {string} */ id) => {
			/** @type {{ id: string, ifRevision: string | null, set: any }} */
			const patch = { id, ifRevision: null, set: null };
			const builder = {
				ifRevisionId: (/** @type {string} */ rev) => ((patch.ifRevision = rev), builder),
				set: (/** @type {any} */ values) => ((patch.set = values), builder),
				patch
			};
			return builder;
		},
		transaction: () => {
			/** @type {any[]} */
			const ops = [];
			const builder = {
				create: (/** @type {any} */ doc) => (ops.push({ create: doc }), builder),
				patch: (/** @type {any} */ patch) => (ops.push({ patch: patch.patch }), builder),
				delete: (/** @type {string} */ id) => (ops.push({ delete: id }), builder),
				commit: async (/** @type {any} */ options) => {
					if (commitErrors.length > 0) throw commitErrors.shift();
					commits.push({ ops, options });
					return [{ _id: 'chart-1', _rev: `rev-saved-${commits.length}` }];
				}
			};
			return builder;
		}
	};

	return { client: /** @type {any} */ (client), commits };
}

describe('saveChartFields', () => {
	it('saves changed fields with a revision when the editor is up to date', async () => {
		const { client, commits } = createFakeClient();

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Generation mix', chartHeight: 250 },
			author: AUTHOR
		});

		expect(result).toMatchObject({ outcome: 'saved', rev: 'rev-saved-1', merged: false });
		expect(commits).toHaveLength(1);

		const [{ ops, options }] = commits;
		expect(options).toEqual({ returnDocuments: true });
		expect(ops).toEqual([
			{ patch: { id: 'chart-1', ifRevision: 'rev-1', set: { title: 'Generation mix' } } },
			{
				create: expect.objectContaining({
					_type: 'stratifyChartRevision',
					chartId: 'chart-1',
					parentRev: 'rev-1',
					kind: 'edit',
					fields: ['title'],
					changes: JSON.stringify([
						{ field: 'title', before: 'Generation', after: 'Generation mix' }
					]),
					summary: 'Title',
					userId: 'user-2',
					userEmail: 'b@example.com'
				})
			}
		]);
	});

	it('writes a baseline revision first for a chart without history', async () => {
		const { client, commits } = createFakeClient({ history: [] });

		await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'New' },
			author: AUTHOR
		});

		expect(commits[0].ops[0]).toEqual({
			create: expect.objectContaining({
				kind: 'baseline',
				rev: 'rev-1',
				parentRev: null,
				fields: [],
				userEmail: 'a@example.com',
				createdAt: '2026-10-01T00:00:00.000Z'
			})
		});
	});

	it('compares JSON-encoded fields by value and skips unchanged saves', async () => {
		const { client, commits } = createFakeClient();

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { userSeriesColours: { solar: '#ff0' } },
			author: AUTHOR
		});

		expect(result).toEqual({ outcome: 'unchanged', rev: 'rev-1' });
		expect(commits).toHaveLength(0);
	});

	it('merges with later saves that touched other fields and returns the merged chart', async () => {
		const { client, commits } = createFakeClient({
			chart: storedChart({ _rev: 'rev-2', chartHeight: 400 }),
			later: [{ fields: ['chartHeight'], userEmail: 'c@example.com', createdAt: '2026-10-02' }]
		});

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Mine' },
			author: AUTHOR
		});

		expect(result.outcome).toBe('saved');
		expect(commits[0].ops[0].patch.ifRevision).toBe('rev-2');
		expect(result).toMatchObject({ merged: true });
		expect(/** @type {any} */ (result).chart).toMatchObject({
			title: 'Mine',
			chartHeight: 400,
			userSeriesColours: { solar: '#ff0' },
			_rev: 'rev-saved-1'
		});
	});

	it('rejects a save whose fields a later save changed to something else', async () => {
		const { client, commits } = createFakeClient({
			chart: storedChart({ _rev: 'rev-2', title: 'Theirs' }),
			later: [{ fields: ['title'], userEmail: 'c@example.com', createdAt: '2026-10-02' }]
		});

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Mine', chartHeight: 300 },
			author: AUTHOR
		});

		expect(result).toMatchObject({
			outcome: 'conflict',
			conflicts: [
				{ field: 'title', changedBy: { userEmail: 'c@example.com', createdAt: '2026-10-02' } }
			],
			latest: { title: 'Theirs', _rev: 'rev-2' }
		});
		expect(commits).toHaveLength(0);
	});

	it('does not count a later save that made the same change as a conflict', async () => {
		const { client } = createFakeClient({
			chart: storedChart({ _rev: 'rev-2', title: 'Same' }),
			later: [{ fields: ['title'], userEmail: 'c@example.com', createdAt: '2026-10-02' }]
		});

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Same' },
			author: AUTHOR
		});

		expect(result.outcome).toBe('unchanged');
	});

	it('treats every differing field as a conflict when the base revision is unknown', async () => {
		const { client } = createFakeClient({ chart: storedChart({ _rev: 'rev-9' }), later: null });

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-0',
			values: { title: 'Mine', chartHeight: 250 },
			author: AUTHOR
		});

		expect(result).toMatchObject({
			outcome: 'conflict',
			conflicts: [{ field: 'title', changedBy: null }]
		});
	});

	it('saves without conflict checks when there is no base revision', async () => {
		const { client, commits } = createFakeClient({ chart: storedChart({ _rev: 'rev-9' }) });

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: null,
			values: { title: 'Legacy' },
			author: AUTHOR
		});

		expect(result).toMatchObject({ outcome: 'saved', merged: false });
		expect(client.fetch).toHaveBeenCalledTimes(1);
		expect(commits).toHaveLength(1);
	});

	it('retries when another save lands between reading and committing', async () => {
		const { client, commits } = createFakeClient({
			commitErrors: [Object.assign(new Error('Revision mismatch'), { statusCode: 409 })]
		});

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Retry' },
			author: AUTHOR
		});

		expect(result.outcome).toBe('saved');
		expect(commits).toHaveLength(1);
	});

	it('gives up after repeated revision mismatches and rethrows other errors', async () => {
		const mismatch = () => Object.assign(new Error('Revision mismatch'), { statusCode: 409 });
		const { client } = createFakeClient({ commitErrors: [mismatch(), mismatch(), mismatch()] });

		await expect(
			saveChartFields(client, {
				id: 'chart-1',
				baseRev: 'rev-1',
				values: { title: 'Retry' },
				author: AUTHOR
			})
		).rejects.toThrow('Revision mismatch');

		const failing = createFakeClient({ commitErrors: [new Error('Network down')] });
		await expect(
			saveChartFields(failing.client, {
				id: 'chart-1',
				baseRev: 'rev-1',
				values: { title: 'Retry' },
				author: AUTHOR
			})
		).rejects.toThrow('Network down');
	});

	it('logs a publish with its kind and summary', async () => {
		const { client, commits } = createFakeClient();

		await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { status: 'published', publishedAt: '2026-10-06T00:00:00Z', title: 'Final' },
			author: AUTHOR
		});

		expect(commits[0].ops[1].create).toMatchObject({
			kind: 'publish',
			summary: 'Published with changes to Title'
		});
	});

	it('reports a missing chart', async () => {
		const { client } = createFakeClient({ chart: null });

		const result = await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'x' },
			author: AUTHOR
		});

		expect(result).toEqual({ outcome: 'not-found' });
	});
});

describe('pickChartFields', () => {
	it('keeps defined registry fields only', () => {
		expect(
			pickChartFields({ title: 'A', y1Min: null, notes: undefined, userId: 'x', _rev: 'r' })
		).toEqual({ title: 'A', y1Min: null });
	});
});

describe('restoreChartVersion', () => {
	it('saves the reverted settings as a restore revision', async () => {
		const { client, commits } = createFakeClient({
			chart: storedChart({ title: 'Newest', chartHeight: 400 })
		});
		const fetchSave = client.fetch.getMockImplementation();
		client.fetch.mockImplementation(
			async (/** @type {string} */ query, /** @type {any} */ params) => {
				if (query.includes('"newer"')) {
					return {
						revision: {
							_id: 'revision-1',
							kind: 'edit',
							fields: ['title'],
							createdAt: '2026-10-02T00:00:00.000Z',
							changes: '[{"field":"title","before":"First","after":"Second"}]'
						},
						newer: [
							{ changes: '[{"field":"title","before":"Second","after":"Newest"}]' },
							{ changes: '[{"field":"chartHeight","before":250,"after":400}]' }
						]
					};
				}
				return fetchSave?.(query, params);
			}
		);

		const result = await restoreChartVersion(client, {
			chart: storedChart({ title: 'Newest', chartHeight: 400 }),
			revisionId: 'revision-1',
			author: AUTHOR
		});

		expect(result).toMatchObject({
			outcome: 'saved',
			chart: { title: 'Second', chartHeight: 250 }
		});
		expect(commits[0].ops[0].patch.set).toEqual({ title: 'Second', chartHeight: 250 });
		expect(commits[0].ops[1].create).toMatchObject({
			kind: 'restore',
			summary: 'Restored Title, Chart height',
			restoredFrom: { revisionId: 'revision-1', createdAt: '2026-10-02T00:00:00.000Z' }
		});
	});

	it('reports an unknown revision', async () => {
		const { client } = createFakeClient();
		client.fetch.mockResolvedValueOnce({ revision: null, newer: [] });

		const result = await restoreChartVersion(client, {
			chart: storedChart(),
			revisionId: 'missing',
			author: AUTHOR
		});

		expect(result).toEqual({ outcome: 'not-found' });
	});
});

describe('saveChartFields history limits', () => {
	const MINE = { _id: 'mine', _rev: 'mine-rev', kind: 'edit', userId: 'user-2' };

	it("folds a person's quick successive edits into their newest entry", async () => {
		const { client, commits } = createFakeClient({
			history: [entryAgo(MINE, 2), BASELINE_ENTRY],
			latestChanges: '[{"field":"title","before":"Original","after":"Generation"}]'
		});

		await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Generation mix', chartHeight: 300 },
			author: AUTHOR
		});

		const [, merge, ...rest] = commits[0].ops;
		expect(rest).toEqual([]);
		expect(merge.patch).toMatchObject({
			id: 'mine',
			ifRevision: 'mine-rev',
			set: {
				fields: ['title', 'chartHeight'],
				changes: JSON.stringify([
					{ field: 'title', before: 'Original', after: 'Generation mix' },
					{ field: 'chartHeight', before: 250, after: 300 }
				]),
				summary: 'Title, Chart height',
				updatedAt: expect.any(String)
			}
		});
	});

	it('removes the entry when the person undoes their own edits', async () => {
		const { client, commits } = createFakeClient({
			history: [entryAgo(MINE, 2), BASELINE_ENTRY],
			latestChanges: '[{"field":"title","before":"Original","after":"Generation"}]'
		});

		await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'Original' },
			author: AUTHOR
		});

		expect(commits[0].ops[1]).toEqual({ delete: 'mine' });
	});

	it.each([
		['by someone else', entryAgo({ ...MINE, userId: 'user-9' }, 2), { title: 'New' }],
		['older than the merge window', entryAgo(MINE, 11), { title: 'New' }],
		['when publishing', entryAgo(MINE, 2), { status: 'published' }],
		['after a publish', { ...entryAgo(MINE, 2), kind: 'publish' }, { title: 'New' }]
	])('starts a new entry %s', async (_, latest, values) => {
		const { client, commits } = createFakeClient({
			history: [latest, BASELINE_ENTRY]
		});

		await saveChartFields(client, { id: 'chart-1', baseRev: 'rev-1', values, author: AUTHOR });

		expect(commits[0].ops[1]).toHaveProperty('create');
	});

	it('deletes the oldest revisions beyond the per-chart limit', async () => {
		const history = Array.from({ length: 55 }, (_, i) => ({
			...BASELINE_ENTRY,
			_id: `old-${i}`,
			kind: 'edit'
		}));
		const { client, commits } = createFakeClient({ history });

		await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { title: 'New' },
			author: AUTHOR
		});

		const deleted = commits[0].ops.filter((op) => op.delete).map((op) => op.delete);
		expect(deleted).toEqual(['old-49', 'old-50', 'old-51', 'old-52', 'old-53', 'old-54']);
	});

	it('keeps one more revision when the save merges rather than adds', async () => {
		const history = [
			entryAgo(MINE, 2),
			...Array.from({ length: 50 }, (_, i) => ({ ...BASELINE_ENTRY, _id: `old-${i}` }))
		];
		const { client, commits } = createFakeClient({
			history,
			latestChanges: '[{"field":"title","before":"Original","after":"Generation"}]'
		});

		await saveChartFields(client, {
			id: 'chart-1',
			baseRev: 'rev-1',
			values: { notes: 'Source' },
			author: AUTHOR
		});

		const deleted = commits[0].ops.filter((op) => op.delete).map((op) => op.delete);
		expect(deleted).toEqual(['old-49']);
	});
});
