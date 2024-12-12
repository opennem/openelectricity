import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(308, '/studio/lens-on-ember');
}
