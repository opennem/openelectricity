import { generator } from '$lib/records.js';
import { error } from '@sveltejs/kit';
import { BASE_URL } from '$env/static/private';

export async function GET(request) {
	const recs = generator();
	const res = Response.json(recs);
	return res;
}
