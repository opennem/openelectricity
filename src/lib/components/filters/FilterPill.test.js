import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FilterPill from './FilterPill.svelte';

describe('filter pill', () => {
	it('swaps in the short label below lg', () => {
		const { body } = render(FilterPill, {
			props: { label: 'National Electricity Market', shortLabel: 'NEM' }
		});
		expect(body).toContain('<span class="lg:hidden">NEM</span>');
		expect(body).toContain('<span class="hidden lg:inline">National Electricity Market</span>');
	});

	it('shows the one label at every width without a short label', () => {
		const { body } = render(FilterPill, { props: { label: 'Daily' } });
		expect(body).toContain('<span>Daily</span>');
		expect(body).not.toContain('lg:');
	});
});
