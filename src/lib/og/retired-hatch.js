/**
 * Retired-facility hatch — the subtle diagonal-line wash layered over facility
 * banners and cards when every unit is retired, marking them as historical the
 * way decommissioned sites are hatched on maps. Shared by the in-app surfaces
 * (FacilityPanelHeader, FacilityCardTile, FacilityOgCard) and the build-time
 * satori OG renderer, so the treatment reads identically everywhere. Kept in
 * `$lib/og` (import-free) so the plain-Node build script can use it.
 *
 * `dark` flips to a dark hatch for the light fuel-tech washes (solar, OCGT…),
 * mirroring the `needsDarkText` convention; photo banners always take the
 * light hatch over their scrims. `scale` thickens the pattern for the fixed
 * 1200×630 OG canvas so it survives downscaling.
 *
 * @param {{ dark?: boolean, scale?: number }} [options]
 * @returns {string} a CSS `repeating-linear-gradient(...)` background image
 */
export function retiredHatch({ dark = false, scale = 1 } = {}) {
	const colour = dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.16)';
	const line = scale;
	const period = 8 * scale;
	return `repeating-linear-gradient(135deg, ${colour} 0px, ${colour} ${line}px, transparent ${line}px, transparent ${period}px)`;
}
