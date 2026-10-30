import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';

/** @typedef {import('@clerk/clerk-js').Clerk} ClerkInstance */

/**
 * A Clerk instance whose `load()` has resolved, so `client` is populated.
 * Only loaded instances are ever exposed via `getClerkState().instance`.
 * @typedef {ClerkInstance & { client: NonNullable<ClerkInstance['client']> }} LoadedClerk
 */

/** @type {LoadedClerk | null} */
let clerkInstance = $state(null);

/** @type {ClerkInstance['user']} */
let clerkUser = $state(undefined); // undefined = loading, null = signed out

let isLoaded = $state(false);

/** @type {Promise<LoadedClerk> | null} */
let initPromise = null;

/** Initialise Clerk (idempotent). Dynamic-imports the SDK so non-auth routes don't pay the ~1.5 MB cost. */
export function initClerk() {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const { Clerk } = await import('@clerk/clerk-js');
		const clerk = new Clerk(PUBLIC_CLERK_PUBLISHABLE_KEY);
		await clerk.load();
		// load() populates `client`; the SDK's types can't express that narrowing.
		const loaded = /** @type {LoadedClerk} */ (clerk);

		clerkInstance = loaded;
		clerkUser = clerk.user ?? null;
		isLoaded = true;

		clerk.addListener(({ user }) => {
			clerkUser = user ?? null;
		});

		return loaded;
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
