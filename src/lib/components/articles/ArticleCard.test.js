import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import ArticleCard from './ArticleCard.svelte';

vi.mock('$lib/sanity', () => ({ urlFor: vi.fn() }));

describe.each(['analysis', 'milestone'])('%s article card', (articleType) => {
	it.each([null, undefined, '', 'invalid', '2026-02-30', '2026-09-15'])(
		'renders a draft with publication date %s',
		(publishDate) => {
			// Drafts may omit fields that are required on published articles.
			const article = /** @type {import('$lib/types/article.types').Article} */ (
				/** @type {unknown} */ ({
					_id: 'drafts.example',
					title: 'Example draft',
					slug: { current: 'example' },
					article_type: articleType,
					publish_date: publishDate,
					fueltech: 'solar',
					summary: 'Draft summary',
					author: [],
					tags: []
				})
			);
			const { body } = render(ArticleCard, { props: { article, preview: true } });

			expect(body).toContain('Example draft');
			expect(body).toContain('href="/article-drafts/example"');
			expect(body).not.toContain('Invalid Date');
			if (publishDate === '2026-09-15') {
				expect(body).toContain('15 Sep 2026');
			} else {
				expect(body).not.toMatch(/\d{2} [A-Z][a-z]{2} \d{4}/);
			}
		}
	);
});
