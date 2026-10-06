import { describe, expect, it, vi } from 'vitest';
import {
	MAX_COLLABORATORS,
	addCollaborator,
	removeCollaborator,
	setCollaboratorRole,
	updateCollaborators
} from './collaborators.js';

const NOW = new Date('2026-10-06T06:00:00.000Z');

/** @param {string} userId @param {'editor' | 'viewer'} role */
function collaborator(userId, role = 'editor') {
	return {
		_key: userId,
		userId,
		email: `${userId}@example.com`,
		role,
		addedAt: '2026-10-01T00:00:00.000Z',
		addedBy: 'owner'
	};
}

describe('addCollaborator', () => {
	it('adds a person keyed by user id', () => {
		expect(
			addCollaborator([], {
				userId: 'u1',
				email: 'u1@example.com',
				role: 'viewer',
				addedBy: 'owner',
				now: NOW
			})
		).toEqual({
			next: [
				{
					_key: 'u1',
					userId: 'u1',
					email: 'u1@example.com',
					role: 'viewer',
					addedAt: '2026-10-06T06:00:00.000Z',
					addedBy: 'owner'
				}
			],
			summary: 'Shared with u1@example.com as viewer'
		});
	});

	it('changes the role of someone already added, or does nothing', () => {
		const person = { userId: 'u1', email: 'u1@example.com', addedBy: 'owner', now: NOW };
		expect(addCollaborator([collaborator('u1')], { ...person, role: 'viewer' })).toMatchObject({
			summary: 'Made u1@example.com a viewer'
		});
		expect(addCollaborator([collaborator('u1')], { ...person, role: 'editor' })).toBeNull();
	});

	it('refuses more than the maximum', () => {
		const full = Array.from({ length: MAX_COLLABORATORS }, (_, i) => collaborator(`u${i}`));
		expect(
			addCollaborator(full, {
				userId: 'extra',
				email: 'x@example.com',
				role: 'viewer',
				addedBy: null,
				now: NOW
			})
		).toEqual({ error: `A chart can be shared with at most ${MAX_COLLABORATORS} people` });
	});
});

describe('setCollaboratorRole and removeCollaborator', () => {
	it('changes roles and removes people', () => {
		const list = [collaborator('u1', 'viewer'), collaborator('u2')];
		expect(setCollaboratorRole(list, 'u1', 'editor')).toMatchObject({
			next: [{ userId: 'u1', role: 'editor' }, { userId: 'u2' }],
			summary: 'Made u1@example.com an editor'
		});
		expect(removeCollaborator(list, 'u2')).toEqual({
			next: [list[0]],
			summary: 'Stopped sharing with u2@example.com'
		});
	});

	it('reports unknown people', () => {
		expect(setCollaboratorRole([], 'u9', 'editor')).toEqual({
			error: 'Not a collaborator on this chart'
		});
		expect(removeCollaborator([], 'u9')).toBeNull();
	});
});

describe('updateCollaborators', () => {
	/** @param {{ history?: any[], collaborators?: any[] }} [options] */
	function createFakeClient({ history = [{ _id: 'old', kind: 'edit' }], collaborators = [] } = {}) {
		/** @type {any[]} */
		const ops = [];
		const client = {
			fetch: vi.fn(async () => ({
				chart: {
					_id: 'chart-1',
					_rev: 'rev-1',
					_updatedAt: '2026-10-01T00:00:00Z',
					userId: 'owner',
					userEmail: 'owner@example.com',
					collaborators
				},
				history
			})),
			patch: (/** @type {string} */ id) => {
				const patch = { id, ifRevision: '', set: /** @type {any} */ (null) };
				const builder = {
					ifRevisionId: (/** @type {string} */ rev) => ((patch.ifRevision = rev), builder),
					set: (/** @type {any} */ values) => ((patch.set = values), builder),
					patch
				};
				return builder;
			},
			transaction: () => {
				const builder = {
					create: (/** @type {any} */ doc) => (ops.push({ create: doc }), builder),
					patch: (/** @type {any} */ patch) => (ops.push({ patch: patch.patch }), builder),
					delete: (/** @type {string} */ id) => (ops.push({ delete: id }), builder),
					commit: async () => [{ _id: 'chart-1', _rev: 'rev-2' }]
				};
				return builder;
			}
		};
		return { client: /** @type {any} */ (client), ops };
	}

	const AUTHOR = { userId: 'owner', userEmail: 'owner@example.com' };

	it('patches the chart and logs a collaborator revision together', async () => {
		const { client, ops } = createFakeClient();

		const result = await updateCollaborators(client, {
			id: 'chart-1',
			change: (list) =>
				addCollaborator(list, {
					userId: 'u1',
					email: 'u1@example.com',
					role: 'editor',
					addedBy: 'owner',
					now: NOW
				}),
			author: AUTHOR
		});

		expect(result).toMatchObject({ outcome: 'saved', rev: 'rev-2', parentRev: 'rev-1' });
		expect(ops[0].patch).toMatchObject({
			id: 'chart-1',
			ifRevision: 'rev-1',
			set: { collaborators: [{ userId: 'u1', role: 'editor' }] }
		});
		expect(ops[1].create).toMatchObject({
			kind: 'collaborator',
			parentRev: 'rev-1',
			fields: [],
			summary: 'Shared with u1@example.com as editor'
		});
	});

	it('writes a baseline first for a chart without history', async () => {
		const { client, ops } = createFakeClient({ history: [] });

		await updateCollaborators(client, {
			id: 'chart-1',
			change: () => ({ next: [], summary: 'x' }),
			author: AUTHOR
		});

		expect(ops[0].create).toMatchObject({ kind: 'baseline' });
	});

	it('reports unchanged and invalid changes without writing', async () => {
		const { client, ops } = createFakeClient();

		expect(
			await updateCollaborators(client, { id: 'chart-1', change: () => null, author: AUTHOR })
		).toEqual({ outcome: 'unchanged', collaborators: [], rev: 'rev-1' });
		expect(
			await updateCollaborators(client, {
				id: 'chart-1',
				change: () => ({ error: 'Nope' }),
				author: AUTHOR
			})
		).toEqual({ outcome: 'invalid', error: 'Nope' });
		expect(ops).toEqual([]);
	});
});
