export async function load({ fetch }) {
	const metadata = await fetch('/api/records/metadata');
	const metadataResponse = await metadata.json();

	return {
		metadata: metadataResponse
	};
}
