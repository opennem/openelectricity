/** @param {string} pathname */
export function isPublicStratifyRoute(pathname) {
	return pathname === '/stratify/docs' || pathname.startsWith('/stratify/docs/');
}

/** @param {{ pathname: string, search: string }} url */
export function stratifySignInRedirect(url) {
	return `${url.pathname}${url.search}`;
}
