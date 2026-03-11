import { createClerkClient, verifyToken } from '@clerk/backend';
import { env } from '$env/dynamic/private';

/**
 * Verify the request's Clerk JWT and check for admin role in privateMetadata.
 * @param {Request} request
 * @returns {Promise<{ authenticated: boolean, isAdmin: boolean, userId?: string }>}
 */
export async function verifyAdmin(request) {
	const token = request.headers.get('Authorization')?.slice(7);
	if (!token) return { authenticated: false, isAdmin: false };

	try {
		const secretKey = env.CLERK_SECRET_KEY;
		const payload = await verifyToken(token, { secretKey });
		const clerk = createClerkClient({ secretKey });
		const user = await clerk.users.getUser(payload.sub);
		const isAdmin = user.privateMetadata?.role === 'admin';
		return { authenticated: true, isAdmin, userId: payload.sub };
	} catch {
		return { authenticated: false, isAdmin: false };
	}
}
