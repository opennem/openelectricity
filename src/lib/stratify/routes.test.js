import { describe, expect, it } from 'vitest';
import { isPublicStratifyRoute, stratifySignInRedirect } from './routes.js';

describe('Stratify route access', () => {
	it('only treats documentation routes as public', () => {
		expect(isPublicStratifyRoute('/stratify/docs')).toBe(true);
		expect(isPublicStratifyRoute('/stratify/docs/examples/wind')).toBe(true);
		expect(isPublicStratifyRoute('/stratify')).toBe(false);
		expect(isPublicStratifyRoute('/stratify/new')).toBe(false);
		expect(isPublicStratifyRoute('/stratify/chart-id')).toBe(false);
	});

	it('preserves template query parameters through sign-in', () => {
		expect(
			stratifySignInRedirect({
				pathname: '/stratify/new',
				search: '?template=wind-generation-range'
			})
		).toBe('/stratify/new?template=wind-generation-range');
	});
});
