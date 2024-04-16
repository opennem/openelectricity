import team from './team.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		team
	};
}
