/**
 * Client-side fetch of a facility's editorial profile (description, photos,
 * external links, owners, unit garnishes) from the profile endpoint. Memoised
 * per code for the lifetime of the page — see `createMemoisedFacilityFetch`.
 */
import { createMemoisedFacilityFetch } from './memoised-facility-fetch.js';

const profile = createMemoisedFacilityFetch((code) => `/api/facility/${code}/profile`);

export const fetchFacilityProfile = profile.fetch;
export const peekFacilityProfile = profile.peek;
