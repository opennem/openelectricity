import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetch: vi.fn(),
	verifyAdmin: vi.fn(),
	findAdminByEmail: vi.fn(),
	updateCollaborators: vi.fn()
}));

vi.mock('$lib/sanity-cms.js', () => ({
	createCmsClient: () => ({ fetch: mocks.fetch })
}));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin,
	findAdminByEmail: mocks.findAdminByEmail
}));

vi.mock('$lib/server/stratify/collaborators.js', async (importOriginal) => ({
	...(await importOriginal()),
	updateCollaborators: mocks.updateCollaborators
}));

import { DELETE, PATCH, POST } from './+server.js';

/**
 * @param {typeof POST} handler
 * @param {string} method
 * @param {unknown} body
 */
function call(handler, method, body) {
	const request = new Request('http://localhost/api/stratify/charts/chart-1/collaborators', {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return handler(/** @type {any} */ ({ request, params: { id: 'chart-1' } }));
}

beforeEach(() => {
	mocks.fetch.mockReset().mockResolvedValue({
		_id: 'chart-1',
		_rev: 'rev-1',
		userId: 'owner',
		status: 'draft',
		collaborators: [{ userId: 'editor-1', role: 'editor' }]
	});
	mocks.verifyAdmin.mockReset().mockResolvedValue({
		isAdmin: true,
		isSuperAdmin: false,
		authenticated: true,
		userId: 'owner',
		userEmail: 'owner@example.com'
	});
	mocks.findAdminByEmail.mockReset().mockResolvedValue({ userId: 'u1', email: 'u1@example.com' });
	mocks.updateCollaborators.mockReset().mockResolvedValue({
		outcome: 'saved',
		collaborators: [],
		rev: 'rev-2',
		parentRev: 'rev-1'
	});
});

describe('POST /api/stratify/charts/:id/collaborators', () => {
	it('adds an admin by email and returns the new revision', async () => {
		const response = await call(POST, 'POST', { email: ' u1@example.com ', role: 'viewer' });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			collaborators: [],
			chart: { _id: 'chart-1', _rev: 'rev-2' },
			parentRev: 'rev-1'
		});
		expect(mocks.findAdminByEmail).toHaveBeenCalledWith('u1@example.com');

		const { change } = mocks.updateCollaborators.mock.calls[0][1];
		expect(change([])).toMatchObject({ next: [{ userId: 'u1', role: 'viewer' }] });
	});

	it('validates the email, role and person', async () => {
		expect((await call(POST, 'POST', { email: 'nope', role: 'viewer' })).status).toBe(400);
		expect((await call(POST, 'POST', { email: 'u1@example.com', role: 'owner' })).status).toBe(400);

		mocks.findAdminByEmail.mockResolvedValueOnce(null);
		expect((await call(POST, 'POST', { email: 'u1@example.com', role: 'viewer' })).status).toBe(
			404
		);

		mocks.findAdminByEmail.mockResolvedValueOnce({ userId: 'owner', email: 'o@example.com' });
		expect((await call(POST, 'POST', { email: 'o@example.com', role: 'viewer' })).status).toBe(400);
		expect(mocks.updateCollaborators).not.toHaveBeenCalled();
	});

	it('lets only the owner share', async () => {
		mocks.verifyAdmin.mockResolvedValue({
			isAdmin: true,
			isSuperAdmin: false,
			authenticated: true,
			userId: 'editor-1'
		});

		expect((await call(POST, 'POST', { email: 'u1@example.com', role: 'viewer' })).status).toBe(
			403
		);
	});
});

describe('PATCH and DELETE /api/stratify/charts/:id/collaborators', () => {
	it('changes a role and removes a person', async () => {
		expect((await call(PATCH, 'PATCH', { userId: 'editor-1', role: 'viewer' })).status).toBe(200);
		expect((await call(DELETE, 'DELETE', { userId: 'editor-1' })).status).toBe(200);
		expect(mocks.updateCollaborators).toHaveBeenCalledTimes(2);
	});

	it('requires the user id and a valid role', async () => {
		expect((await call(PATCH, 'PATCH', { userId: 'editor-1', role: 'admin' })).status).toBe(400);
		expect((await call(DELETE, 'DELETE', {})).status).toBe(400);
	});

	it('reports invalid changes', async () => {
		mocks.updateCollaborators.mockResolvedValue({
			outcome: 'invalid',
			error: 'Not a collaborator'
		});

		const response = await call(PATCH, 'PATCH', { userId: 'u9', role: 'viewer' });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Not a collaborator' });
	});
});
