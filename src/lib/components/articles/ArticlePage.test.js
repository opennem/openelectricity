import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import AnalysisPage from '../../../routes/(main)/analysis/[article]/+page.svelte';
import DraftPage from '../../../routes/(main)/article-drafts/[article]/+page.svelte';

vi.mock('$app/stores', async () => {
	const { readable } = await import('svelte/store');
	return { page: readable({ url: new URL('https://openelectricity.org.au/analysis/example') }) };
});

vi.mock('$lib/sanity', () => ({
	urlFor: (/** @type {{ alt: string }} */ image) => ({
		height: () => ({ url: () => `/images/${image.alt}.jpg` })
	})
}));

/** @param {string} text */
function paragraph(text) {
	return {
		_type: 'block',
		_key: text,
		style: 'normal',
		markDefs: [],
		children: [{ _type: 'span', _key: `${text}-span`, text, marks: [] }]
	};
}

const data = {
	title: 'Example article',
	summary: 'Article summary',
	publishDate: '2026-09-15',
	cover: { alt: 'cover' },
	author: [{ name: 'Example author', position: 'Writer', bio: 'Author biography', image: null }],
	tldr: [paragraph('Short version')],
	content: [paragraph('Full article body')],
	charts: {}
};

describe.each([
	{ label: 'published', component: AnalysisPage, backLink: '/analysis', canonical: true },
	{ label: 'draft', component: DraftPage, backLink: '/article-drafts', canonical: false }
])('$label article page', ({ component, backLink, canonical }) => {
	it('renders the article and preserves route-specific navigation and metadata', () => {
		const { body, head } = render(component, { props: { data } });

		for (const text of [
			'Example article',
			'Article summary',
			'15th Sep, 2026',
			'Example author',
			'Author biography',
			'Short version',
			'Full article body'
		]) {
			expect(body).toContain(text);
		}
		expect(body).toContain('src="/images/cover.jpg"');
		expect(body).toContain('src="/favicon.png"');
		expect(body).toContain(`href="${backLink}"`);
		expect(head.includes('rel="canonical"')).toBe(canonical);
		expect(head).toContain('property="og:type" content="article"');
	});

	it.each([null, '', 'invalid'])(
		'omits publication date %s without inventing a date',
		(publishDate) => {
			const { body } = render(component, { props: { data: { ...data, publishDate } } });
			expect(body).toContain('Example article');
			expect(body).not.toMatch(/\d+(?:st|nd|rd|th) [A-Z][a-z]{2}, \d{4}/);
		}
	);

	it('renders without optional article content', () => {
		const { body } = render(component, {
			props: { data: { ...data, cover: null, author: null, tldr: null, content: null } }
		});
		expect(body).toContain('Example article');
		expect(body).not.toContain('<figure');
	});
});

it('uses identical article markup for drafts and published articles', () => {
	const published = render(AnalysisPage, { props: { data } });
	const draft = render(DraftPage, { props: { data } });
	expect(draft.body.replace('href="/article-drafts"', 'href="/analysis"')).toBe(published.body);
});
