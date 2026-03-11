import { Clerk } from '@clerk/clerk-js';
import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';

/** @type {Clerk | null} */
let clerkInstance = $state(null);

/** @type {import('@clerk/types').UserResource | null | undefined} */
let clerkUser = $state(undefined); // undefined = loading, null = signed out

let isLoaded = $state(false);

/** @type {Promise<Clerk> | null} */
let initPromise = null;

/** Initialise Clerk (idempotent) */
export function initClerk() {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const clerk = new Clerk(PUBLIC_CLERK_PUBLISHABLE_KEY);
		await clerk.load();

		clerkInstance = clerk;
		clerkUser = clerk.user ?? null;
		isLoaded = true;

		clerk.addListener(({ user }) => {
			clerkUser = user ?? null;
		});

		return clerk;
	})();

	return initPromise;
}

export function getClerkState() {
	return {
		get instance() {
			return clerkInstance;
		},
		get user() {
			return clerkUser;
		},
		get isLoaded() {
			return isLoaded;
		}
	};
}
