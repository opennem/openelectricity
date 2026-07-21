import { getHomepageRenewablesCached } from '$lib/oe-api/renewables-cache.server';

/**
 * Public endpoint for the homepage fossil-vs-renewables dataset. The homepage
 * itself calls `getHomepageRenewablesCached` directly in load(), so this route
 * exists for direct/external consumers — the HTTP cache-control below governs
 * those hits, while the shared SWR module governs origin freshness.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ setHeaders, platform }) {
	const result = await getHomepageRenewablesCached(platform);

	// Monthly data — long edge cache with stale-while-revalidate for direct
	// hits; errors must never be cached or a transient OE failure would stick.
	setHeaders({
		'cache-control': result.error
			? 'no-store'
			: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
	});

	return Response.json(result);
}
