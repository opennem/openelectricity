import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { refreshCpi } from '../src/lib/server/cpi-refresh.js';

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
const allowed = args.filter((_, i) => i !== outputIndex + 1 || outputIndex < 0);
if (
	allowed.some((arg) => !['--publish', '--output'].includes(arg)) ||
	(outputIndex >= 0 && (!output || output.startsWith('--')))
) {
	throw new Error('Usage: pnpm cpi:refresh [--publish] [--output path.json]');
}
try {
	const baseline = JSON.parse(
		await readFile(new URL('../src/lib/server/data/abs-cpi.json', import.meta.url), 'utf8')
	);
	const { snapshot, published, changed } = await refreshCpi({
		baseline,
		publish,
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
		namespaceId: process.env.CPI_KV_NAMESPACE_ID,
		token: process.env.CPI_CLOUDFLARE_API_TOKEN
	});
	if (output) await writeFile(resolve(output), JSON.stringify(snapshot, null, '\t') + '\n');
	console.log(
		`${snapshot.observations.length} quarters through ${snapshot.observations.at(-1).period}; ${published ? 'published to KV' : changed ? 'validated (no publish)' : 'unchanged'}.`
	);
} catch (error) {
	console.error(error instanceof Error ? error.message : 'CPI refresh failed');
	process.exitCode = 1;
}
