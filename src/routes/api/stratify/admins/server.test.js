import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ verifyAdmin: vi.fn(), searchAdmins: vi.fn() }));

vi.mock('$lib/auth/clerk-server.js', () => ({
	verifyAdmin: mocks.verifyAdmin,
	searchAdmins: mocks.searchAdmins
}));

import { GET } from './+server.js';

/** @param {string} query */
function get(query) {
	const url = new URL(`http://localhost/api/stratify/admins${query}`);
	return GET(/** @type {any} */ ({ request: new Request(url), url }));
}

beforeEach(() => {
	mocks.verifyAdmin.mockReset().mockResolvedValue({ isAdmin: true, authenticated: true });
	mocks.searchAdmins
		.mockReset()
		.mockResolvedValue([{ userId: 'u1', email: 'ann@example.com', name: 'Ann' }]);
});

describe('GET /api/stratify/admins', () => {
	it('searches admins for a trimmed query, uncached', async () => {
		const response = await get('?q=%20ann%20');

		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({
			admins: [{ userId: 'u1', email: 'ann@example.com', name: 'Ann' }]
		});
		expect(mocks.searchAdmins).toHaveBeenCalledWith('ann');
	});

	it('skips short queries and rejects long ones', async () => {
		expect(await (await get('?q=a')).json()).toEqual({ admins: [] });
		expect((await get(`?q=${'a'.repeat(101)}`)).status).toBe(400);
		expect(mocks.searchAdmins).not.toHaveBeenCalled();
	});

	it('is for admins only', async () => {
		mocks.verifyAdmin.mockResolvedValue({ isAdmin: false, authenticated: true });
		expect((await get('?q=ann')).status).toBe(403);
	});
});
