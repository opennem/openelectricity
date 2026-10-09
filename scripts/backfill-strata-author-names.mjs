/**
 * One-off: give already-published Stratify charts an `authorName` byline.
 *
 * Public chart pages show the author's name instead of their email; new
 * publishes record it (`$lib/server/stratify/author-name.js`). This fills in
 * charts published before that. Dry run by default; `--write` saves.
 *
 * Needs PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, SANITY_CMS_TOKEN and
 * the CLERK_SECRET_KEY of the Clerk instance the charts' owners belong to:
 *
 *   doppler run --config prd -- node scripts/backfill-strata-author-names.mjs [--write]
 */
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@sanity/client';

const args = process.argv.slice(2);
const write = args.includes('--write');
if (args.some((arg) => arg !== '--write')) {
	throw new Error('Usage: node scripts/backfill-strata-author-names.mjs [--write]');
}

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, SANITY_CMS_TOKEN, CLERK_SECRET_KEY } =
	process.env;
for (const [name, value] of Object.entries({
	PUBLIC_SANITY_PROJECT_ID,
	PUBLIC_SANITY_DATASET,
	SANITY_CMS_TOKEN,
	CLERK_SECRET_KEY
})) {
	if (!value) throw new Error(`${name} is not set`);
}

const sanity = createClient({
	projectId: PUBLIC_SANITY_PROJECT_ID,
	dataset: PUBLIC_SANITY_DATASET,
	apiVersion: '2025-04-30',
	useCdn: false,
	token: SANITY_CMS_TOKEN
});
const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

/** @type {Array<{ _id: string, title?: string, userId?: string }>} */
const charts = await sanity.fetch(
	`*[_type == "stratifyChart" && status == "published" && !defined(authorName)]{ _id, title, userId }`
);
console.log(`${charts.length} published chart(s) without a byline in "${PUBLIC_SANITY_DATASET}".`);

/** Owner name per user ID: a name, null (no name in Clerk) or undefined (not
 * found in this Clerk instance). */
/** @type {Map<string, string | null | undefined>} */
const names = new Map();
let saved = 0;
for (const chart of charts) {
	if (!chart.userId) {
		console.log(`- ${chart._id} "${chart.title ?? ''}": no owner, skipped`);
		continue;
	}
	if (!names.has(chart.userId)) {
		try {
			const user = await clerk.users.getUser(chart.userId);
			const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
			names.set(chart.userId, name || user.username || null);
		} catch {
			names.set(chart.userId, undefined);
		}
	}
	const name = names.get(chart.userId);
	if (name === undefined) {
		console.log(`- ${chart._id} "${chart.title ?? ''}": owner not found in this Clerk instance`);
		continue;
	}
	if (!name) {
		console.log(`- ${chart._id} "${chart.title ?? ''}": owner has no name in Clerk, skipped`);
		continue;
	}
	console.log(`- ${chart._id} "${chart.title ?? ''}": ${name}${write ? '' : ' (dry run)'}`);
	if (write) {
		await sanity.patch(chart._id).set({ authorName: name }).commit();
		saved++;
	}
}

console.log(write ? `Saved ${saved} byline(s).` : 'Dry run: nothing saved. Re-run with --write.');
