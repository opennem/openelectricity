import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';

/** @type {import('@clerk/clerk-js').Clerk | null} */
let clerkInstance = $state(null);

/** @type {import('@clerk/types').UserResource | null | undefined} */
let clerkUser = $state(undefined); // undefined = loading, null = signed out

let isLoaded = $state(false);

/** @type {Promise<import('@clerk/clerk-js').Clerk> | null} */
let initPromise = null;

/** Initialise Clerk (idempotent). Dynamic-imports the SDK so non-auth routes don't pay the ~1.5 MB cost. */
export function initClerk() {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const { Clerk } = await import('@clerk/clerk-js');
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
