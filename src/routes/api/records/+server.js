import { generator } from '$lib/records.js';
import { error } from '@sveltejs/kit';

export async function GET({ fetch, setHeaders }) {
	const recs = generator();
	const res = Response.json(recs);
	return res;
}
