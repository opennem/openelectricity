export async function load({ data, url }) {
	const { searchParams } = url;
	const region = searchParams.get('region') || 'x-WRD';
	const interval = searchParams.get('interval') || 'yearly';

	return {
		...data, // pipe through data from PageServer

		region,
		interval
	};
}
