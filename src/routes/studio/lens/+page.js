export async function load({ data, url }) {
	const { searchParams } = url;
	const region = searchParams.get('region') || 'x-WRD';

	return {
		...data, // pipe through data from PageServer

		region
	};
}
