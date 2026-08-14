import { error } from '@sveltejs/kit';
import { getStratifyGuide, stratifyGuides } from '$lib/stratify/guide-catalogue.js';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const guide = getStratifyGuide(params.slug);
	if (!guide) error(404, 'Guide not found');
	const index = stratifyGuides.findIndex((item) => item.slug === guide.slug);
	return {
		guide,
		previous: index > 0 ? stratifyGuides[index - 1] : null,
		next: index < stratifyGuides.length - 1 ? stratifyGuides[index + 1] : null
	};
}
