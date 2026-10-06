import { describe, expect, it } from 'vitest';
import { canAccess } from '$lib/stratify/chart-permissions.js';
import { getChartAccess } from './chart-access.js';

describe('getChartAccess', () => {
	const owner = { userId: 'user-1', isSuperAdmin: false };
	const other = { userId: 'user-2', isSuperAdmin: false };
	const superadmin = { userId: 'user-3', isSuperAdmin: true };
	const collaborators = [
		{ userId: 'user-4', role: 'editor' },
		{ userId: 'user-5', role: 'viewer' }
	];

	it('gives the owner and superadmins owner access', () => {
		const draft = { userId: 'user-1', status: 'draft' };
		expect(getChartAccess(draft, owner)).toBe('owner');
		expect(getChartAccess(draft, superadmin)).toBe('owner');
	});

	it('gives collaborators their role, even on a draft', () => {
		const draft = { userId: 'user-1', status: 'draft', collaborators };
		expect(getChartAccess(draft, { userId: 'user-4', isSuperAdmin: false })).toBe('editor');
		expect(getChartAccess(draft, { userId: 'user-5', isSuperAdmin: false })).toBe('viewer');
	});

	it('lets other admins read published charts only', () => {
		expect(getChartAccess({ userId: 'user-1', status: 'published' }, other)).toBe('reader');
		expect(getChartAccess({ userId: 'user-1', status: 'draft', collaborators }, other)).toBeNull();
	});

	it('never matches a chart without an owner to a user without an id', () => {
		expect(getChartAccess({ status: 'draft' }, { isSuperAdmin: false })).toBeNull();
	});
});

describe('canAccess', () => {
	it('lets editors edit and restore but not publish, share or delete', () => {
		expect(canAccess('editor', 'edit')).toBe(true);
		expect(canAccess('editor', 'restore')).toBe(true);
		expect(canAccess('editor', 'publish')).toBe(false);
		expect(canAccess('editor', 'share')).toBe(false);
		expect(canAccess('editor', 'delete')).toBe(false);
	});

	it('lets viewers read, see history and fork only', () => {
		expect(canAccess('viewer', 'history')).toBe(true);
		expect(canAccess('viewer', 'fork')).toBe(true);
		expect(canAccess('viewer', 'edit')).toBe(false);
		expect(canAccess('viewer', 'restore')).toBe(false);
	});

	it('keeps history from readers of a published chart', () => {
		expect(canAccess('reader', 'history')).toBe(false);
		expect(canAccess(null, 'read')).toBe(false);
	});
});
