import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUserList: vi.fn() }));

vi.mock('@clerk/backend', () => ({
	createClerkClient: () => ({ users: { getUserList: mocks.getUserList } }),
	verifyToken: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({ env: { CLERK_SECRET_KEY: 'sk_test' } }));

import { findAdminIds, searchAdmins } from './clerk-server.js';

/**
 * @param {string} id
 * @param {{ role?: string, email?: string, firstName?: string | null, lastName?: string | null }} [options]
 */
function user(
	id,
	{ role = 'admin', email = `${id}@example.com`, firstName = null, lastName = null } = {}
) {
	return {
		id,
		firstName,
		lastName,
		primaryEmailAddressId: `${id}-email`,
		emailAddresses: [{ id: `${id}-email`, emailAddress: email }],
		privateMetadata: role ? { role } : {}
	};
}

beforeEach(() => mocks.getUserList.mockReset());

describe('searchAdmins', () => {
	it('keeps only admins, with their primary email and name', async () => {
		mocks.getUserList.mockResolvedValue({
			data: [
				user('u1', { firstName: 'Ann', lastName: 'Lee' }),
				user('u2', { role: '' }),
				user('u3')
			]
		});

		expect(await searchAdmins('example')).toEqual([
			{ userId: 'u1', email: 'u1@example.com', name: 'Ann Lee' },
			{ userId: 'u3', email: 'u3@example.com', name: null }
		]);
		expect(mocks.getUserList).toHaveBeenCalledWith(
			expect.objectContaining({ query: 'example', limit: 50 })
		);
	});

	it('returns at most the limit', async () => {
		mocks.getUserList.mockResolvedValue({ data: [user('u1'), user('u2'), user('u3')] });

		expect(await searchAdmins('u', { limit: 2 })).toHaveLength(2);
	});
});

describe('findAdminIds', () => {
	it('returns the ids that still have the admin role, without a call for none', async () => {
		mocks.getUserList.mockResolvedValue({ data: [user('u1'), user('u2', { role: 'viewer' })] });

		expect(await findAdminIds(['u1', 'u2'])).toEqual(new Set(['u1']));
		expect(await findAdminIds([])).toEqual(new Set());
		expect(mocks.getUserList).toHaveBeenCalledOnce();
	});
});
