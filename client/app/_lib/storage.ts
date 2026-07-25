/**
 * Per-user storage allowance. The backend doesn't report a quota yet, so this
 * is the one static number in the drive — shared by the sidebar gauge and the
 * AI panel's context so they can't disagree.
 */
export const STORAGE_QUOTA_BYTES = 15 * 1024 ** 3;
