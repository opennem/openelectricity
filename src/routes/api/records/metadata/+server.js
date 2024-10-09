import { PUBLIC_RECORDS_API } from '$env/static/public';

export function GET({ fetch }) {
	const path = `${PUBLIC_RECORDS_API}/metadata`;

	return fetch(path);
}
