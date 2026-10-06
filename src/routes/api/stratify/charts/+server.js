import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { normaliseChart } from '$lib/stratify/chart-data.js';
import { encodeChartFields, withChartDefaults } from '$lib/stratify/chart-fields.js';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

/**
 * Parse a positive integer query param, falling back when missing/invalid.
 * @param {string | null} value
 * @param {number} fallback
 */
function toPositiveInt(value, fallback) {
	const n = Number.parseInt(value ?? '', 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * GET /api/stratify/charts — list own charts + community charts.
 *
 * Each section is paginated independently and returned as
 * `{ items, total, page, totalPages }` where items are full normalised
 * chart documents (including csvText, for thumbnail rendering).
 *
 * Query params:
 * - scope: 'all' (default) | 'my' | 'community' — fetch one section only
 * - myPage / communityPage: 1-based page numbers
 * - pageSize: items per section page (default 12, max 100)
 * - q: search term matched against title/description
 * - status: 'draft' | 'published' — applied to my charts always, to
 *   community charts only for superadmins (normal users always see
 *   published community charts only)
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, url }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const scope = url.searchParams.get('scope') ?? 'all';
	const statusFilter = url.searchParams.get('status');
	const search = url.searchParams.get('q')?.trim();
	const pageSize = Math.min(
		toPositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
		MAX_PAGE_SIZE
	);
	const myPage = toPositiveInt(url.searchParams.get('myPage'), 1);
	const communityPage = toPositiveInt(url.searchParams.get('communityPage'), 1);

	const client = createCmsClient();

	const statusClause = statusFilter ? ' && status == $status' : '';
	const searchClause = search ? ' && (title match $q || description match $q)' : '';

	const myFilters = `_type == "stratifyChart" && userId == $userId${statusClause}${searchClause}`;
	// Community charts: superadmin sees all (optionally status-filtered), normal users published only
	const communityFilters = auth.isSuperAdmin
		? `_type == "stratifyChart" && userId != $userId${statusClause}${searchClause}`
		: `_type == "stratifyChart" && userId != $userId && status == "published"${searchClause}`;

	const params = {
		userId: auth.userId,
		...(statusFilter ? { status: statusFilter } : {}),
		...(search ? { q: `*${search}*` } : {})
	};

	/**
	 * @param {string} filters
	 * @param {number} page
	 */
	async function fetchSection(filters, page) {
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const [total, docs] = await Promise.all([
			/** @type {Promise<number>} */ (client.fetch(`count(*[${filters}])`, params)),
			client.fetch(`*[${filters}] | order(_updatedAt desc) [${start}...${end}] { ... }`, params)
		]);
		return {
			items: docs.map((/** @type {Record<string, any>} */ doc) => ({
				...normaliseChart(doc),
				status: doc.status,
				userEmail: doc.userEmail,
				publishedAt: doc.publishedAt,
				_createdAt: doc._createdAt,
				_updatedAt: doc._updatedAt
			})),
			total,
			page,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}

	const [my, community] = await Promise.all([
		scope === 'community' ? null : fetchSection(myFilters, myPage),
		scope === 'my' ? null : fetchSection(communityFilters, communityPage)
	]);

	return json({
		...(my ? { my } : {}),
		...(community ? { community } : {}),
		isSuperAdmin: auth.isSuperAdmin
	});
}

/**
 * POST /api/stratify/charts — create a new draft chart document. Missing
 * registry fields take their defaults (new charts start as stacked area).
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const body = await request.json();

	if (!body.csvText) {
		return json({ error: 'csvText is required' }, { status: 400 });
	}

	const client = createCmsClient();
	const doc = await client.create({
		_type: 'stratifyChart',
		userId: auth.userId,
		userEmail: auth.userEmail,
		...encodeChartFields({
			...withChartDefaults(body),
			chartType: body.chartType ?? 'stacked-area',
			status: 'draft',
			publishedAt: null
		})
	});

	return json({ chart: { _id: doc._id, _rev: doc._rev } }, { status: 201 });
}
