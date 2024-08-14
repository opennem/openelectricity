import { error } from '@sveltejs/kit';

export async function load({ fetch, url }) {
	// try {
	// 	// const date = url.searchParams.get('date');
	// 	// const fuelTechs = url.searchParams.get('fuel_techs');
	// 	const date = null;
	// 	let dateParams = date ? `?date=${date}` : '';
	// 	console.log('dateParams', date);
	// 	const data = await fetch(`/api/records${dateParams}`);

	// 	if (data && data.ok) {
	// 		const recordsResponse = await data.json();

	// 		return {
	// 			records: recordsResponse.data,
	// 			count: recordsResponse.total_records
	// 		};
	// 	}
	// } catch (e) {
	// 	console.log(e);
	// 	return {
	// 		records: []
	// 	};
	// }
	const { searchParams } = url;
	const pageParam = searchParams.get('page');
	const regionsParam = searchParams.get('regions');

	return {
		records: [],
		page: pageParam ? parseInt(pageParam) : 1,
		regions: regionsParam ? regionsParam.split(',') : []
	};

	// error(404, 'Not found');
}
