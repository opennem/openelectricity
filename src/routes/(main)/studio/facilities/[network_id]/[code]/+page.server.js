export async function load({ fetch, params }) {
	const { network_id, code } = params;

	console.log('network_id', network_id);
	console.log('code', code);

	const response = await fetch(`/api/facility/${network_id}/${code}/data`);
	const data = await response.json();
	return {
		facility: data,
		network_id: network_id,
		code: code
	};
}
