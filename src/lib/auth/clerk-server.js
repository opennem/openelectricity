import { createClerkClient, verifyToken } from '@clerk/backend';
import { env } from '$env/dynamic/private';

/**
 * Whether a Clerk user has the admin role (Stratify and other admin tools).
 * @param {{ privateMetadata?: Record<string, unknown> }} user
 */
function isAdminUser(user) {
	return user.privateMetadata?.role === 'admin';
}

/**
 * Verify the request's Clerk JWT and check for admin role in privateMetadata.
 * @param {Request} request
 * @returns {Promise<{ authenticated: boolean, isAdmin: boolean, isSuperAdmin: boolean, userId?: string, userEmail?: string }>}
 */
export async function verifyAdmin(request) {
	const token = request.headers.get('Authorization')?.slice(7);
	if (!token) return { authenticated: false, isAdmin: false, isSuperAdmin: false };

	try {
		const secretKey = env.CLERK_SECRET_KEY;
		const payload = await verifyToken(token, { secretKey });
		const clerk = createClerkClient({ secretKey });
		const user = await clerk.users.getUser(payload.sub);
		const isAdmin = isAdminUser(user);
		const isSuperAdmin = user.privateMetadata?.stratify_role === 'superadmin';
		const userEmail = user.emailAddresses?.[0]?.emailAddress ?? '';
		return { authenticated: true, isAdmin, isSuperAdmin, userId: payload.sub, userEmail };
	} catch {
		return { authenticated: false, isAdmin: false, isSuperAdmin: false };
	}
}

/**
 * Find an admin user by email address, for sharing a Stratify chart.
 * Returns null when no user has that address or the user is not an admin.
 * @param {string} email
 * @returns {Promise<{ userId: string, email: string } | null>}
 */
export async function findAdminByEmail(email) {
	const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
	const { data } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
	const user = data[0];
	if (!user || !isAdminUser(user)) return null;
	const address =
		user.emailAddresses.find((entry) => entry.emailAddress.toLowerCase() === email.toLowerCase())
			?.emailAddress ?? email;
	return { userId: user.id, email: address };
}

