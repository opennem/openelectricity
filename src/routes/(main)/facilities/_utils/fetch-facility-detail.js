/**
 * Client-side fetch of a facility's complete data (every unit, all fuel techs and
 * statuses) from the single-facility endpoint — independent of the /facilities
 * list filters, so the detail panel can show the whole facility (matching the
 * dedicated /facility/[code] page) instead of only the filtered units. Memoised
 * per code for the lifetime of the page — see `createMemoisedFacilityFetch`.
 */
import { createMemoisedFacilityFetch } from './memoised-facility-fetch.js';

const detail = createMemoisedFacilityFetch((code) => `/api/facility/${code}`);

export const fetchFacilityDetail = detail.fetch;
export const peekFacilityDetail = detail.peek;
