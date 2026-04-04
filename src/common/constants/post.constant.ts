export const POST_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export type PostVisibilityType =
  (typeof POST_VISIBILITY)[keyof typeof POST_VISIBILITY];
