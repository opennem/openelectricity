import { createClerkClient, verifyToken } from '@clerk/backend';
import { env } from '$env/dynamic/private';

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
		const isAdmin = user.privateMetadata?.role === 'admin';
		const isSuperAdmin = user.privateMetadata?.stratify_role === 'superadmin';
		const userEmail = user.emailAddresses?.[0]?.emailAddress ?? '';
		return { authenticated: true, isAdmin, isSuperAdmin, userId: payload.sub, userEmail };
	} catch {
		return { authenticated: false, isAdmin: false, isSuperAdmin: false };
	}
}
