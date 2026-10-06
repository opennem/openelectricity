import { describe, expect, it } from 'vitest';
import { getChartAccess } from './chart-access.js';

describe('getChartAccess', () => {
	const owner = { userId: 'user-1', isSuperAdmin: false };
	const other = { userId: 'user-2', isSuperAdmin: false };
	const superadmin = { userId: 'user-3', isSuperAdmin: true };

	it('gives the owner and superadmins owner access', () => {
		const draft = { userId: 'user-1', status: 'draft' };
		expect(getChartAccess(draft, owner)).toBe('owner');
		expect(getChartAccess(draft, superadmin)).toBe('owner');
	});

	it('lets other admins read published charts only', () => {
		expect(getChartAccess({ userId: 'user-1', status: 'published' }, other)).toBe('reader');
		expect(getChartAccess({ userId: 'user-1', status: 'draft' }, other)).toBeNull();
	});

	it('never matches a chart without an owner to a user without an id', () => {
		expect(getChartAccess({ status: 'draft' }, { isSuperAdmin: false })).toBeNull();
	});
});
