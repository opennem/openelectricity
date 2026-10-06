import { describe, expect, it, vi } from 'vitest';
import { pickChartFields, saveChartFields } from './save-chart.js';

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

/**
 * Minimal Sanity client: answers the chart and later-revisions queries and
 * records transactions. `commitErrors` are thrown by successive commits.
 * @param {{
 *   chart?: Record<string, any> | null,
 *   hasHistory?: boolean,
 *   later?: Array<{ fields: string[], userEmail: string, createdAt: string }> | null,
 *   commitErrors?: unknown[]
 * }} [options]
 */
function createFakeClient({
	chart = storedChart(),
	hasHistory = true,
	later = null,
	commitErrors = []
} = {}) {
	/** @type {Array<{ ops: any[], options: any }>} */
	const commits = [];

	const client = {
		fetch: vi.fn(async (/** @type {string} */ query) => {
			if (query.includes('"hasHistory"')) return { chart, hasHistory };
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

		expect(result).toEqual({ outcome: 'saved', rev: 'rev-saved-1', latest: null });
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
		const { client, commits } = createFakeClient({ hasHistory: false });

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
				createdAt: '2026-10-01T00:00:00Z'
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
		expect(/** @type {any} */ (result).latest).toMatchObject({
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

		expect(result).toMatchObject({ outcome: 'saved', latest: null });
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
