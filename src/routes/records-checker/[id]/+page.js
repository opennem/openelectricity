export async function load({ params, fetch, url }) {
	const id = params.id;
	const pageParam = url.searchParams.get('page');

	return {
		id,
		page: pageParam ? parseInt(pageParam) : 1
	};
}
