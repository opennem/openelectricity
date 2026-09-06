/** Identity shared by network charts and consumers of their settled snapshots.
 * Presentation (height, colours, SI prefix) never changes the underlying data.
 * @param {{region: string, group: string, metric: string, interval: string,
 * displayInterval: string, start: number, end: number, bucketFilter?: string | null,
 * excludedGroups?: string[]}} query
 */
export function networkQueryKey(query) {
	return JSON.stringify([
		query.region,
		query.group,
		query.metric,
		query.interval,
		query.displayInterval,
		query.start,
		query.end,
		query.bucketFilter ?? null,
		[...(query.excludedGroups ?? [])].sort()
	]);
}
