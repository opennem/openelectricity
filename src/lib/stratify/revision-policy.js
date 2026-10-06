/**
 * How much Stratify chart history is kept (shared by the save path and the
 * History drawer).
 *
 * Every save writes a Sanity document, and the dataset's document count is
 * the limit that matters (Growth plan: 50,000), so history is bounded two
 * ways: one person's quick successive saves fold into one entry, and each
 * chart keeps only its newest entries.
 */

/** Revisions kept per chart; the oldest beyond this are deleted on save. */
export const REVISION_LIMIT = 50;

/** A person's edits within this long of their entry's first save join it. */
export const MERGE_WINDOW_MS = 10 * 60 * 1000;
