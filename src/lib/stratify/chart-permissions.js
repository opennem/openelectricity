/**
 * What each level of access to a Stratify chart allows. Shared by the
 * server (`$lib/server/stratify/chart-access.js` decides the access) and the
 * builder (which shows or hides controls to match).
 *
 * - `owner`: the chart's creator, or a superadmin. Everything.
 * - `editor`: a collaborator who edits content, sees history and restores.
 * - `viewer`: a collaborator who opens the chart read-only, sees history
 *   and forks.
 * - `reader`: any Stratify admin, for a published chart. Reads and forks.
 */

/** @typedef {'owner' | 'editor' | 'viewer' | 'reader'} ChartAccess */
/** @typedef {'editor' | 'viewer'} CollaboratorRole */
/** @typedef {'read' | 'edit' | 'publish' | 'delete' | 'share' | 'history' | 'restore' | 'fork'} ChartAction */

/** @type {Record<ChartAccess, readonly ChartAction[]>} */
const PERMISSIONS = {
	owner: ['read', 'edit', 'publish', 'delete', 'share', 'history', 'restore', 'fork'],
	editor: ['read', 'edit', 'history', 'restore', 'fork'],
	viewer: ['read', 'history', 'fork'],
	reader: ['read', 'fork']
};

/** @type {readonly CollaboratorRole[]} */
export const COLLABORATOR_ROLES = ['editor', 'viewer'];

/**
 * @param {ChartAccess | null | undefined} access
 * @param {ChartAction} action
 */
export function canAccess(access, action) {
	return Boolean(access) && PERMISSIONS[/** @type {ChartAccess} */ (access)].includes(action);
}
