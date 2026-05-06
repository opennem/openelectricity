import { createCmsClient } from '$lib/sanity-cms.js';
import { normaliseChart } from '$lib/stratify/chart-data.js';

const PAGE_SIZE = 12;

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, setHeaders }) {
	setHeaders({ 'Cache-Control': 'no-store, max-age=0' });
	const client = createCmsClient();

	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const start = (page - 1) * PAGE_SIZE;
	const end = start + PAGE_SIZE;

	const [total, charts] = await Promise.all([
		/** @type {Promise<number>} */ (
			client.fetch(`count(*[_type == "stratifyChart" && status == "published"])`)
		),
		client.fetch(
			`*[_type == "stratifyChart" && status == "published"] | order(publishedAt desc)[${start}...${end}]{
				...,
				"userEmail": userEmail
			}`
		)
	]);

	return {
		charts: charts.map((/** @type {Record<string, any>} */ chart) => ({
			...normaliseChart(chart),
			publishedAt: chart.publishedAt,
			userEmail: chart.userEmail
		})),
		pagination: {
			currentPage: page,
			pageSize: PAGE_SIZE,
			total,
			totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
		}
	};
}
