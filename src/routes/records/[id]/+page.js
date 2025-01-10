export async function load({ data, params, url }) {
	const id = params.id;
	const pageParam = url.searchParams.get('page');

	return {
		...data, // pipe through data from PageServer

		id,
		page: pageParam ? parseInt(pageParam) : 1
	};
}
