/**
 * Open Graph facility card dimensions — the single source of truth shared by the
 * card renderer (`$lib/server/og/facility-card.js`, run in Node) and the facility
 * page's social-meta tags (`og:image:width/height/type`). 1200×630 is the
 * OG-recommended size. Kept here (not under `$lib/server`) so the client-rendered
 * facility page can import it too.
 */
export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;
export const OG_CARD_TYPE = 'image/jpeg';
