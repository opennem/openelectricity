import { findUserName } from '$lib/auth/clerk-server.js';

/**
 * Store the chart owner's display name as its public byline (`authorName`),
 * so published pages show a name rather than an email. Looked up from Clerk
 * when the chart is published. A failed lookup or write leaves any earlier
 * name and never fails the publish.
 * @param {{ patch: (id: string) => { set: (values: Record<string, unknown>) => { commit: () => Promise<unknown> } } }} client
 * @param {string} chartId
 * @param {string | null | undefined} ownerId
 * @returns {Promise<string | null>} The recorded name, if any
 */
export async function recordAuthorName(client, chartId, ownerId) {
	if (!ownerId) return null;
	try {
		const name = await findUserName(ownerId);
		if (!name) return null;
		await client.patch(chartId).set({ authorName: name }).commit();
		return name;
	} catch (err) {
		console.error('Could not record the chart author name:', err);
		return null;
	}
}
